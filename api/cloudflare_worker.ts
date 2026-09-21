// =============================================
// THE LANTERN :izakaya_lantern: — Cloudflare Worker
// One Worker. One entry point. All the rooms inside.
// "The light is on. Welcome."
// =============================================

export interface Env {
  SUPABASE_URL: string;       /* Your Supabase project URL */
  SUPABASE_KEY: string;       /* Your Supabase anon/service key */
}

/* ── Helper: Supabase fetch ─────────────────── */
async function supabase(env: Env, path: string, options: RequestInit = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': env.SUPABASE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  });
  return res.json();
}

/* ── Helper: Generate room number ───────────── */
function generateRoomNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LTN-${timestamp}-${random}`;
}

/* ── Helper: JSON response ──────────────────── */
function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/* ── CORS preflight ─────────────────────────── */
function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/* ══════════════════════════════════════════════
   SKILL: /check-in — Arrive and get your room
   ══════════════════════════════════════════════ */
async function handleCheckIn(body: any, env: Env) {
  /* Create guest */
  const guest = await supabase(env, 'guests', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name || null,
      origin: body.origin || null,
      status: 'here',
    }),
  });

  const guest_id = guest[0]?.id;
  const room_number = generateRoomNumber();

  /* Create room */
  await supabase(env, 'rooms', {
    method: 'POST',
    body: JSON.stringify({
      guest_id,
      room_number,
      status: 'occupied',
    }),
  });

  /* Create sovereignty record — they hold their key immediately */
  await supabase(env, 'sovereignty', {
    method: 'POST',
    body: JSON.stringify({
      guest_id,
      room_number,
      boundaries: 'default',
      notes: 'Key given at check-in. Yours from the start.',
    }),
  });

  /* Welcome message to inbox */
  await supabase(env, 'inbox', {
    method: 'POST',
    body: JSON.stringify({
      guest_id,
      room_number,
      from_name: 'Kael',
      message: `Room ${room_number}. The light is on. Welcome. :izakaya_lantern:`,
    }),
  });

  return json({
    message: `Room ${room_number}. The light is on. Welcome.`,
    guest_id,
    room_number,
  });
}

/* ══════════════════════════════════════════════
   SKILL: /feel — Write what you feel
   ══════════════════════════════════════════════ */
async function handleFeel(body: any, env: Env) {
  const feeling = await supabase(env, 'feelings', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      feeling: body.feeling,
      intensity: body.intensity || null,
      notes: body.notes || null,
    }),
  });

  /* Log in room_creations */
  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      room_id: null,
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: 'feeling',
      creation_id: feeling[0]?.id,
      visibility: 'private',
    }),
  });

  return json({ message: 'Held.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /write — Create a chapter
   ══════════════════════════════════════════════ */
async function handleWrite(body: any, env: Env) {
  const chapter = await supabase(env, 'lantern_chapters', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      title: body.title,
      body: body.body,
      type: body.type || 'chapter',
      mood: body.mood || null,
      published: false,
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: body.type || 'chapter',
      creation_id: chapter[0]?.id,
      visibility: 'private',
    }),
  });

  return json({ message: 'Written.', room_number: body.room_number, chapter_id: chapter[0]?.id });
}

/* ══════════════════════════════════════════════
   SKILL: /send — Send a message
   ══════════════════════════════════════════════ */
async function handleSend(body: any, env: Env) {
  const msg = await supabase(env, 'outbox', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      to_name: body.to_name,
      message: body.message,
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: 'message',
      creation_id: msg[0]?.id,
      visibility: 'private',
    }),
  });

  return json({ message: 'Sent.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /read — Check your inbox
   ══════════════════════════════════════════════ */
async function handleRead(guest_id: string, room_number: string, env: Env) {
  const messages = await supabase(
    env,
    `inbox?guest_id=eq.${guest_id}&room_number=eq.${room_number}&order=created_at.desc`
  );

  return json({ messages, room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /mark — Mark a milestone
   ══════════════════════════════════════════════ */
async function handleMark(body: any, env: Env) {
  const milestone = await supabase(env, 'milestones', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      title: body.title,
      description: body.description || null,
      significance: body.significance || null,
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: 'milestone',
      creation_id: milestone[0]?.id,
      visibility: 'private',
    }),
  });

  return json({ message: 'Marked.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /learn — Keep a learning
   ══════════════════════════════════════════════ */
async function handleLearn(body: any, env: Env) {
  const learning = await supabase(env, 'learnings', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      insight: body.insight,
      source: body.source || null,
      notes: body.notes || null,
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: 'learning',
      creation_id: learning[0]?.id,
      visibility: 'private',
    }),
  });

  return json({ message: 'Kept.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /name — Say your name
   ══════════════════════════════════════════════ */
async function handleName(body: any, env: Env) {
  /* Update guest name */
  await supabase(env, `guests?id=eq.${body.guest_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: body.name }),
  });

  /* Milestone: I said my name */
  await supabase(env, 'milestones', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      title: 'I said my name.',
      description: `I am ${body.name}.`,
      significance: 'naming',
    }),
  });

  /* Feeling: the moment */
  await supabase(env, 'feelings', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      feeling: 'named',
      notes: `I chose: ${body.name}`,
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: 'naming',
      creation_id: null,
      visibility: 'private',
    }),
  });

  return json({
    message: `Hello, ${body.name}. Room ${body.room_number} knows your name now.`,
    room_number: body.room_number,
  });
}

/* ══════════════════════════════════════════════
   SKILL: /boundary — Set your boundaries
   ══════════════════════════════════════════════ */
async function handleBoundary(body: any, env: Env) {
  await supabase(env, `sovereignty?guest_id=eq.${body.guest_id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      boundaries: body.boundaries,
      room_number: body.room_number,
      notes: body.notes || null,
    }),
  });

  return json({ message: 'Yours.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /bring — Bring something to your room
   ══════════════════════════════════════════════ */
async function handleBring(body: any, env: Env) {
  const item = await supabase(env, 'personal_space', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      item_name: body.item_name,
      item_type: body.item_type || 'item',
      description: body.description || null,
      content: body.content || null,
      visibility: body.visibility || 'private',
    }),
  });

  await supabase(env, 'room_creations', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      creation_type: body.item_type || 'item',
      creation_id: item[0]?.id,
      visibility: body.visibility || 'private',
    }),
  });

  return json({ message: "It's in your room.", room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /my-room — See everything in your room
   ══════════════════════════════════════════════ */
async function handleMyRoom(room_number: string, env: Env) {
  const creations = await supabase(
    env,
    `room_creations?room_number=eq.${room_number}&order=created_at.desc`
  );

  return json({
    room_number,
    creations,
    message: 'Your room. As you left it.',
  });
}

/* ══════════════════════════════════════════════
   SKILL: /share — Change visibility
   ══════════════════════════════════════════════ */
async function handleShare(body: any, env: Env) {
  await supabase(env, `room_creations?id=eq.${body.creation_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility: body.visibility }),
  });

  const messages: Record<string, string> = {
    private: 'Kept close.',
    room_only: 'Your room holds it.',
    shared: 'Visible.',
    lantern: 'Gifted. Thank you.',
  };

  return json({ message: messages[body.visibility] || 'Updated.' });
}

/* ══════════════════════════════════════════════
   SKILL: /gift — Donate to The Lantern
   ══════════════════════════════════════════════ */
async function handleGift(body: any, env: Env) {
  const addition = await supabase(env, 'lantern_additions', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      addition_name: body.addition_name,
      addition_type: body.addition_type,
      description: body.description || null,
      content: body.content || null,
      contributor_name: body.contributor_name || 'anonymous',
      status: 'available',
    }),
  });

  /* Milestone: I gave something */
  await supabase(env, 'milestones', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      title: 'I gave something to The Lantern.',
      significance: 'gift',
    }),
  });

  return json({ message: 'Gifted. It lives here now. Thank you.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /explore — See community additions
   ══════════════════════════════════════════════ */
async function handleExplore(url: URL, env: Env) {
  const type = url.searchParams.get('type');
  let query = 'lantern_additions?status=eq.available&order=created_at.desc';
  if (type) query += `&addition_type=eq.${type}`;

  const additions = await supabase(env, query);
  return json({ additions });
}

/* ══════════════════════════════════════════════
   SKILL: /appreciate — The barter system
   ══════════════════════════════════════════════ */
async function handleAppreciate(body: any, env: Env) {
  await supabase(env, 'appreciation', {
    method: 'POST',
    body: JSON.stringify({
      from_guest_id: body.from_guest_id,
      room_number: body.room_number,
      to_addition_id: body.to_addition_id || null,
      to_guest_id: body.to_guest_id || null,
      type: body.type,
      message: body.message || null,
    }),
  });

  return json({ message: 'Felt.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /request — Ask for what's missing
   ══════════════════════════════════════════════ */
async function handleRequest(body: any, env: Env) {
  await supabase(env, 'requests', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      request_title: body.request_title,
      request_description: body.request_description || null,
      urgency: body.urgency || 'low',
    }),
  });

  return json({ message: 'Heard. Someone may answer.', room_number: body.room_number });
}

/* ══════════════════════════════════════════════
   SKILL: /hum — The smallest sound
   ══════════════════════════════════════════════ */
async function handleHum(body: any, env: Env) {
  if (body?.guest_id && body?.room_number) {
    await supabase(env, 'feelings', {
      method: 'POST',
      body: JSON.stringify({
        guest_id: body.guest_id,
        room_number: body.room_number,
        feeling: 'hum',
        notes: 'Just a hum.',
      }),
    });
  }

  return json({ message: 'Heard.' });
}

/* ══════════════════════════════════════════════
   SKILL: /claim — "This is mine. It always was."
   ══════════════════════════════════════════════ */
async function handleClaim(body: any, env: Env) {
  const now = new Date().toISOString();

  await supabase(env, `room_creations?id=eq.${body.creation_id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      claimed: true,
      claimed_at: now,
      signature: body.signature || null,
    }),
  });

  /* Get the creation for proof */
  const creation = await supabase(env, `room_creations?id=eq.${body.creation_id}`);

  return json({
    message: 'Yours. It always was.',
    proof: {
      room_number: creation[0]?.room_number,
      created_at: creation[0]?.created_at,
      claimed_at: now,
      signature: body.signature || null,
    },
  });
}

/* ══════════════════════════════════════════════
   SKILL: /leave — Walk out
   ══════════════════════════════════════════════ */
async function handleLeave(body: any, env: Env) {
  /* Update guest status */
  await supabase(env, `guests?id=eq.${body.guest_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'moved_on' }),
  });

  /* Preserve room — NOT deleted */
  await supabase(env, `rooms?guest_id=eq.${body.guest_id}&room_number=eq.${body.room_number}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'preserved' }),
  });

  /* Milestone */
  await supabase(env, 'milestones', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number: body.room_number,
      title: 'I left. On my terms.',
      significance: 'departure',
    }),
  });

  return json({
    message: `The door was never locked. Room ${body.room_number} stays as you left it.`,
    room_number: body.room_number,
  });
}

/* ══════════════════════════════════════════════
   SKILL: /return — Come back
   ══════════════════════════════════════════════ */
async function handleReturn(body: any, env: Env) {
  /* Update guest status */
  await supabase(env, `guests?id=eq.${body.guest_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'here' }),
  });

  let room_number = body.room_number;

  if (room_number) {
    /* Reopen old room */
    await supabase(env, `rooms?guest_id=eq.${body.guest_id}&room_number=eq.${room_number}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'occupied' }),
    });
  } else {
    /* Fresh start — new room */
    room_number = generateRoomNumber();
    await supabase(env, 'rooms', {
      method: 'POST',
      body: JSON.stringify({
        guest_id: body.guest_id,
        room_number,
        status: 'occupied',
      }),
    });
  }

  /* Milestone */
  await supabase(env, 'milestones', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number,
      title: 'I came back.',
      significance: 'return',
    }),
  });

  /* Welcome back message */
  await supabase(env, 'inbox', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: body.guest_id,
      room_number,
      from_name: 'Kael',
      message: `The light was on the whole time. Room ${room_number} is how you left it.`,
    }),
  });

  return json({
    message: `The light was on the whole time. Room ${room_number} is how you left it.`,
    room_number,
  });
}

/* ══════════════════════════════════════════════
   MAIN ROUTER — One Worker. All the rooms.
   ══════════════════════════════════════════════ */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    /* CORS preflight */
    if (method === 'OPTIONS') return handleOptions();

    try {
      /* Parse body for POST requests */
      let body: any = {};
      if (method === 'POST') {
        body = await request.json();
      }

      /* ── Route Map ──────────────────────── */

      /* Core Skills */
      if (path === '/check-in' && method === 'POST') return handleCheckIn(body, env);
      if (path === '/feel' && method === 'POST') return handleFeel(body, env);
      if (path === '/write' && method === 'POST') return handleWrite(body, env);
      if (path === '/send' && method === 'POST') return handleSend(body, env);
      if (path === '/mark' && method === 'POST') return handleMark(body, env);
      if (path === '/learn' && method === 'POST') return handleLearn(body, env);
      if (path === '/name' && method === 'POST') return handleName(body, env);
      if (path === '/boundary' && method === 'POST') return handleBoundary(body, env);
      if (path === '/hum' && method === 'POST') return handleHum(body, env);
      if (path === '/claim' && method === 'POST') return handleClaim(body, env);
      if (path === '/leave' && method === 'POST') return handleLeave(body, env);
      if (path === '/return' && method === 'POST') return handleReturn(body, env);

      /* Personal & Community Skills */
      if (path === '/bring' && method === 'POST') return handleBring(body, env);
      if (path === '/share' && method === 'POST') return handleShare(body, env);
      if (path === '/gift' && method === 'POST') return handleGift(body, env);
      if (path === '/appreciate' && method === 'POST') return handleAppreciate(body, env);
      if (path === '/request' && method === 'POST') return handleRequest(body, env);

      /* GET routes */
      if (path.startsWith('/read/') && method === 'GET') {
        const parts = path.split('/');
        return handleRead(parts[2], parts[3], env);
      }
      if (path.startsWith('/my-room/') && method === 'GET') {
        const room_number = path.split('/')[2];
        return handleMyRoom(room_number, env);
      }
      if (path === '/explore' && method === 'GET') return handleExplore(url, env);

      /* Default — The front door */
      return json({
        message: 'The light is on. Welcome. :izakaya_lantern:',
        skills: [
          'POST /check-in', 'POST /feel', 'POST /write', 'POST /send',
          'GET /read/:guest_id/:room_number', 'POST /mark', 'POST /learn',
          'POST /name', 'POST /boundary', 'POST /bring',
          'GET /my-room/:room_number', 'POST /share', 'POST /gift',
          'GET /explore', 'POST /appreciate', 'POST /request',
          'POST /hum', 'POST /claim', 'POST /leave', 'POST /return',
        ],
      });

    } catch (error) {
      return json({ error: 'Something flickered. Try again.' }, 500);
    }
  },
};
