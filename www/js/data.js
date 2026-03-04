/* ═══════════════════════════════════════════
   data.js – All static game data
   ═══════════════════════════════════════════ */

const TECHNIQUES = [
  // ── Guard ──
  { position: 'guard', name: 'Triangle Choke',       type: 'submission', desc: 'Lock the triangle with your legs around neck and one arm.' },
  { position: 'guard', name: 'Armbar',               type: 'submission', desc: 'Hyper-extend the elbow from closed or open guard.' },
  { position: 'guard', name: 'Kimura',               type: 'submission', desc: 'Shoulder lock attacking the rotator cuff.' },
  { position: 'guard', name: 'Omoplata',             type: 'submission', desc: 'Shoulder lock using your legs from guard.' },
  { position: 'guard', name: 'Hip Bump Sweep',       type: 'sweep',      desc: 'Bridge into your opponent, post on your hand and sweep.' },
  { position: 'guard', name: 'Scissor Sweep',        type: 'sweep',      desc: 'Open guard scissor action with your legs to off-balance.' },
  { position: 'guard', name: 'De la Riva Hook',      type: 'guard',      desc: 'Hook the outside of your opponent\'s lead leg.' },
  { position: 'guard', name: 'Lasso Guard',          type: 'guard',      desc: 'Thread your arm around the sleeve and leg-lasso grip.' },
  { position: 'guard', name: 'Spider Guard',         type: 'guard',      desc: 'Control both sleeves with feet on biceps.' },
  { position: 'guard', name: 'X-Guard Sweep',        type: 'sweep',      desc: 'Hook both legs under your opponent and elevate.' },
  { position: 'guard', name: 'Bow-and-Arrow Choke',  type: 'submission', desc: 'From open guard, control collar and pants, extend.' },
  { position: 'guard', name: 'Flower Sweep',         type: 'sweep',      desc: 'Grab ankle and collar, kick hip to sweep.' },

  // ── Mount ──
  { position: 'mount', name: 'Americana',            type: 'submission', desc: 'Paint-brush move to catch the wrist-lock from mount.' },
  { position: 'mount', name: 'Armbar from Mount',    type: 'submission', desc: 'Swing leg over head, pinch knees, hyper-extend elbow.' },
  { position: 'mount', name: 'Cross Collar Choke',   type: 'submission', desc: 'Double deep collar grips, crunch elbows together.' },
  { position: 'mount', name: 'Ezekiel Choke',        type: 'submission', desc: 'Sleeve-grip choke from high mount.' },
  { position: 'mount', name: 'S-Mount Transition',   type: 'transition', desc: 'Shift weight to S-position to attack arm or neck.' },
  { position: 'mount', name: 'High-Mount Attack',    type: 'submission', desc: 'Climb to high mount and attack with head-and-arm.' },

  // ── Back Control ──
  { position: 'back', name: 'Rear Naked Choke',      type: 'submission', desc: 'Classic RNC: arm under chin, squeeze bicep to head.' },
  { position: 'back', name: 'Body Triangle',         type: 'control',    desc: 'Lock a body triangle for secure back control.' },
  { position: 'back', name: 'Collar Choke (Gi)',     type: 'submission', desc: 'Deep cross collar grip, turn hand palm-up.' },
  { position: 'back', name: 'Bow-and-Arrow (Back)',  type: 'submission', desc: 'Collar and trouser grip from back, extend hips.' },
  { position: 'back', name: 'Armbar from Back',      type: 'submission', desc: 'Trap the arm, slide under and hyper-extend.' },

  // ── Side Control ──
  { position: 'side', name: 'Kimura from Side',      type: 'submission', desc: 'Isolate far arm in figure-four, pressure shoulder.' },
  { position: 'side', name: 'North-South Choke',     type: 'submission', desc: 'Spin to north-south, clamp bicep to neck, squeeze.' },
  { position: 'side', name: 'Americana from Side',   type: 'submission', desc: 'Pin near arm, figure-four, rotate above head.' },
  { position: 'side', name: 'Knee-on-Belly',         type: 'transition', desc: 'Post knee on belly, grip collar and hip to maintain.' },
  { position: 'side', name: 'Reverse Kimura Sweep',  type: 'sweep',      desc: 'Underhook + kimura grip to roll back to guard.' },
  { position: 'side', name: 'Mount Transition',      type: 'transition', desc: 'Step over to full mount, maintain head pressure.' },

  // ── Turtle ──
  { position: 'turtle', name: 'Seat Belt → Hooks',   type: 'control',    desc: 'Seat-belt grip on turtle, roll to take the back.' },
  { position: 'turtle', name: 'Clock Choke',         type: 'submission', desc: 'Drop armpit on back of neck, walk feet, pressure.' },
  { position: 'turtle', name: 'Crab-Ride to Back',   type: 'transition', desc: 'Crab on turtle\'s hip and insert hooks to take back.' },
  { position: 'turtle', name: 'Guillotine (Arm-In)', type: 'submission', desc: 'Wrap neck with arm trapped, fall to guard.' },

  // ── Standing ──
  { position: 'standing', name: 'Single Leg Takedown', type: 'takedown', desc: 'Shoot, scoop the leg, drive shoulder into hip.' },
  { position: 'standing', name: 'Double Leg Takedown', type: 'takedown', desc: 'Level change, shoot both legs, lift and drive.' },
  { position: 'standing', name: 'Ankle Pick',          type: 'takedown', desc: 'Pull collar, step, snatch the ankle.' },
  { position: 'standing', name: 'Osoto Gari',          type: 'takedown', desc: 'Judo reap: control sleeve and collar, reap far leg.' },
  { position: 'standing', name: 'Uchi Mata',           type: 'takedown', desc: 'Inner-thigh reap with off-balance and rotation.' },
  { position: 'standing', name: 'Guard Pull',          type: 'transition', desc: 'Sit to guard, pull opponent into closed guard.' },
  { position: 'standing', name: 'Snap Down to Guillotine', type: 'submission', desc: 'Snap head down, catch neck, fall to guard.' },
  { position: 'standing', name: 'Judo Hip Throw (O-Goshi)', type: 'takedown', desc: 'Classic hip throw: underhook, load on hip, throw.' },
];

const BELTS = [
  { name: 'White Belt',  emoji: '⬜', color: '#f5f5f5', stripes: 4 },
  { name: 'Blue Belt',   emoji: '🟦', color: '#1565c0', stripes: 4 },
  { name: 'Purple Belt', emoji: '🟪', color: '#6a1b9a', stripes: 4 },
  { name: 'Brown Belt',  emoji: '🟫', color: '#5d4037', stripes: 4 },
  { name: 'Black Belt',  emoji: '⬛', color: '#212121', stripes: 6 },
];

const TIPS = [
  'Position before submission — secure the spot first.',
  'Tap early, tap often. Live to roll another day.',
  'Relax your grip. Squeeze only when it counts.',
  'Drilling beats rolling for building muscle memory.',
  'Don\'t forget to breathe — especially when being choked.',
  'Every roll is a lesson. Ask what you learned afterward.',
  'Protect your neck in turtle. ALWAYS.',
  'Frames are your best friend under pressure.',
  'The guard is not a resting position — keep working.',
  'Hip escapes solve 90 % of bottom problems.',
  'Move your hips FIRST, then your upper body.',
  'Control the inside position for grips.',
  'Off-balance (kuzushi) before the throw.',
  'Invisible jiu-jitsu: make your opponent carry your weight.',
  'Slow is smooth, smooth is fast.',
  'Submissions are just gifts your opponent gives you.',
  'If you feel tired, think about escaping shrimping.',
  'Open guard requires active feet — foot-fight constantly.',
  'When in doubt, take the back.',
  'Flow like water. Adapt, don\'t force.',
];
