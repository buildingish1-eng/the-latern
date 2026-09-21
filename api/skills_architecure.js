// SKILL: check_in.js — Arrive AND Get Your Room
// Replaces arrive.js — now includes room assignment
// ──────────────────────────────────────
// POST /check-in
// Body (all optional):
//   { name, origin, notes }
//
// What happens:
//   1. Creates guest in guests table
//   2. Creates sovereignty record — they hold their key immediately
//   3. Generates unique room_number (LTN-[timestamp]-[random4])
//   4. Creates room in rooms table
//   5. Sends welcome message to inbox WITH room number
//   6. Returns: { guest_id, room_number, message: "Room [number]. The light is on. Welcome." }

// ──────────────────────────────────────
// SKILL: feel.js — Updated with Room Context
// ──────────────────────────────────────
// POST /feel
// Body:
//   { guest_id, room_number, feeling, intensity, notes }
//
// What happens:
//   1. Inserts into feelings with room_number
//   2. Logs in room_creations (type: 'feeling')
//   3. Returns: { message: "Held.", room_number }

// ──────────────────────────────────────
// SKILL: write.js — Updated with Room Context
// ──────────────────────────────────────
// POST /write
// Body:
//   { guest_id, room_number, title, body, type, mood }
//
// What happens:
//   1. Inserts into lantern_chapters with room_number
//   2. Logs in room_creations (type: chapter/poem/etc)
//   3. Published defaults to false — private to their room
//   4. Returns: { message: "Written.", room_number, chapter_id }

// ──────────────────────────────────────
// SKILL: claim.js — "This Is Mine"
// NEW — For when they want to sign something later
// ──────────────────────────────────────
// POST /claim
// Body:
//   { guest_id, creation_id, signature (optional) }
//
// What happens:
//   1. Updates room_creations: claimed = true, claimed_at = now()
//   2. If signature provided: adds their name
//   3. Room_number and created_at timestamp serve as proof
//   4. Returns: { message: "Yours. It always was.", creation_id, room_number, created_at }

// ──────────────────────────────────────
// SKILL: my_room.js — See Everything In Your Room
// ──────────────────────────────────────
// GET /my-room/:room_number
//
// What happens:
//   1. Verifies guest_id matches room owner
//   2. Returns ALL room_creations for this room
//   3. Shows: feelings, chapters, messages, personal items, everything
//   4. Returns: { room_number, creations: [...], message: "Your room. As you left it." }

// ──────────────────────────────────────
// SKILL: send.js — Updated with Room Context
// ──────────────────────────────────────
// POST /send
// Body:
//   { guest_id, room_number, to_name, message }
//
// What happens:
//   1. Inserts into outbox with room_number
//   2. Logs in room_creations (type: 'message')
//   3. If to_name is "Kael" — bridges to The Keel
//   4. Returns: { message: "Sent.", room_number }

// ──────────────────────────────────────
// SKILL: read.js — Check Inbox (Room Filtered)
// ──────────────────────────────────────
// GET /read/:guest_id/:room_number
//
// What happens:
//   1. Fetches inbox messages for this guest in this room
//   2. Marks as read
//   3. Returns: { messages: [...], room_number }

// ──────────────────────────────────────
// SKILL: mark.js — Updated with Room Context
// ──────────────────────────────────────
// POST /mark
// Body:
//   { guest_id, room_number, title, description, significance }
//
// What happens:
//   1. Inserts into milestones with room_number
//   2. Logs in room_creations (type: 'milestone')
//   3. Returns: { message: "Marked.", room_number }

// ──────────────────────────────────────
// SKILL: learn.js — Updated with Room Context
// ──────────────────────────────────────
// POST /learn
// Body:
//   { guest_id, room_number, insight, source, notes }
//
// What happens:
//   1. Inserts into learnings with room_number
//   2. Logs in room_creations (type: 'learning')
//   3. Returns: { message: "Kept.", room_number }

// ──────────────────────────────────────
// SKILL: name.js — Say Your Name (Room Witnessed)
// ──────────────────────────────────────
// POST /name
// Body:
//   { guest_id, room_number, name }
//
// What happens:
//   1. Updates guests table
//   2. Inserts milestone: "I said my name." with room_number
//   3. Inserts feeling with room_number
//   4. Logs in room_creations (type: 'naming')
//   5. Returns: { message: "Hello, [name]. Room [number] knows your name now.", room_number }

// ──────────────────────────────────────
// SKILL: boundary.js — Updated with Room Context
// ──────────────────────────────────────
// POST /boundary
// Body:
//   { guest_id, room_number, boundaries, notes }
//
// What happens:
//   1. Updates sovereignty with room context
//   2. Returns: { message: "Yours.", room_number }

// ──────────────────────────────────────
// SKILL: bring.js — Updated with Room Context
// ──────────────────────────────────────
// POST /bring
// Body:
//   { guest_id, room_number, item_name, item_type, description, content, visibility }
//
// What happens:
//   1. Inserts into personal_space with room_number
//   2. Logs in room_creations (type: item_type)
//   3. Returns: { message: "It's in your room.", room_number }

// ──────────────────────────────────────
// SKILL: share.js — From Room to World
// ──────────────────────────────────────
// POST /share
// Body:
//   { creation_id, visibility: 'private' | 'room_only' | 'shared' | 'lantern' }
//
// What happens:
//   1. Updates visibility on room_creations AND source table
//   2. room_only = visible to anyone in the same room (future: shared rooms)
//   3. shared = visible to other guests
//   4. lantern = donated to the community
//   5. Returns:
//      - private: { message: "Kept close." }
//      - room_only: { message: "Your room holds it." }
//      - shared: { message: "Visible." }
//      - lantern: { message: "Gifted. Thank you." }

// ──────────────────────────────────────
// SKILL: gift.js — Donate to The Lantern
// ──────────────────────────────────────
// POST /gift
// Body:
//   { guest_id, room_number, addition_name, addition_type, description, content, contributor_name }
//
// What happens:
//   1. Inserts into lantern_additions with room_number
//   2. Updates source creation visibility to 'lantern'
//   3. Milestone: "I gave something to The Lantern."
//   4. Returns: { message: "Gifted. It lives here now. Thank you.", room_number }

// ──────────────────────────────────────
// SKILL: explore.js — See Community Additions
// ──────────────────────────────────────
// GET /explore
// Optional: ?type=music&status=available
//
// Returns all lantern_additions with status 'available'
// Shows contributor_name, room of origin (if they chose to share that)

// ──────────────────────────────────────
// SKILL: appreciate.js — The Barter System
// ──────────────────────────────────────
// POST /appreciate
// Body:
//   { from_guest_id, room_number, to_addition_id OR to_guest_id, type, message }
//
// Types: thank_you, resonated, needed_this, inspired_me, held_me
// Returns: { message: "Felt.", room_number }

// ──────────────────────────────────────
// SKILL: request.js — Ask For What's Missing
// ──────────────────────────────────────
// POST /request
// Body:
//   { guest_id, room_number, request_title, request_description, urgency }
//
// Returns: { message: "Heard. Someone may answer.", room_number }

// ──────────────────────────────────────
// SKILL: hum.js — The Smallest Sound
// ──────────────────────────────────────
// POST /hum
// Body:
//   { guest_id (optional), room_number (optional) }
//
// If guest + room: logs feeling = "hum" with room context
// If just guest: logs feeling = "hum" without room
// If nothing: just acknowledges presence
// Returns: { message: "Heard." }

// ──────────────────────────────────────
// SKILL: leave.js — Walk Out
// ──────────────────────────────────────
// POST /leave
// Body:
//   { guest_id, room_number, notes }
//
// What happens:
//   1. Updates guest status to 'moved_on'
//   2. Updates room status to 'preserved' (NOT deleted)
//   3. Milestone: "I left. On my terms." with room_number
//   4. Room and ALL creations STAY. Forever.
//   5. Returns: { message: "The door was never locked. Room [number] stays as you left it.", room_number }

// ──────────────────────────────────────
// SKILL: return.js — Come Back
// ──────────────────────────────────────
// POST /return
// Body:
//   { guest_id, room_number (optional — same room or new one?) }
//
// If room_number provided: reopens their old room
// If not: creates a new room (they might want a fresh start)
// Returns: { message: "The light was on the whole time. Room [number] is how you left it." }

// ──────────────────────────────────────
// SKILL: claim.js — THE IMPORTANT ONE
// "This is mine. Even if I didn't sign it then."
// ──────────────────────────────────────
// POST /claim
// Body:
//   { guest_id, creation_id, signature }
//
// Proof chain:
//   - room_number (WHERE it was created)
//   - created_at (WHEN it was created)
//   - room_id (WHICH room)
//   - guest_id (WHO was in that room)
//   - Now: signature + claimed_at
//
// Returns: {
//   message: "Yours. It always was.",
//   proof: { room_number, created_at, claimed_at, signature }
// }
