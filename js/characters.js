/**
 * Jujutsu Shenanigans - Character Definitions
 * Based on the Roblox game by Tze (1.6B+ visits)
 */

const CHARACTERS = [
  {
    id: 'vessel',
    name: 'VESSEL',
    subName: 'Yuji Itadori',
    icon: '👊',
    badge: null,
    hp: 250,
    color: '#ff6b6b',
    description: 'Fast M1s. Counter-heavy playstyle.',
    moves: [
      {
        name: 'Divergent Fist',
        key: '1',
        damage: 22,
        cooldown: 6,
        description: 'Delayed cursed energy launches opponent back.',
        type: 'melee'
      },
      {
        name: 'Manji Kick',
        key: '2',
        damage: 18,
        cooldown: 8,
        description: 'Counter move — lunges toward enemy and kicks.',
        type: 'counter'
      },
      {
        name: 'Black Flash',
        key: '3',
        damage: 35,
        cooldown: 14,
        description: 'Cursed energy concentrates at point of impact.',
        type: 'melee'
      },
      {
        name: 'Boogie Woogie',
        key: '4',
        damage: 15,
        cooldown: 10,
        description: 'Swap positions with a target instantly.',
        type: 'utility'
      }
    ],
    special: {
      name: 'Hollow Wicker Basket',
      damage: 45,
      cooldown: 25,
      description: 'Unleashes a devastating flurry of cursed strikes.'
    },
    awakening: {
      name: 'King of Curses',
      subName: 'Sukuna',
      hpBonus: 0.7, // restores 70% HP
      moves: [
        {
          name: 'Cleave',
          key: '1',
          damage: 40,
          cooldown: 5,
          type: 'slash'
        },
        {
          name: 'Dismantle',
          key: '2',
          damage: 55,
          cooldown: 9,
          type: 'slash'
        },
        {
          name: 'Flame Arrow',
          key: '3',
          damage: 48,
          cooldown: 12,
          type: 'ranged'
        },
        {
          name: 'World Slash',
          key: '4',
          damage: 70,
          cooldown: 18,
          type: 'aoe'
        }
      ],
      special: {
        name: 'Malevolent Shrine',
        damage: 120,
        cooldown: 0,
        description: 'Domain Expansion — relentless slashes hit the entire area.'
      },
      duration: 60
    }
  },

  {
    id: 'honored_one',
    name: 'HONORED ONE',
    subName: 'Gojo Satoru',
    icon: '🌀',
    badge: null,
    hp: 300,
    color: '#74c0fc',
    description: 'Teleport combos. Infinity blocks.',
    moves: [
      {
        name: 'Blue',
        key: '1',
        damage: 28,
        cooldown: 7,
        description: 'Cursed technique lapse — pulls enemies in.',
        type: 'ranged'
      },
      {
        name: 'Red',
        key: '2',
        damage: 32,
        cooldown: 9,
        description: 'Reversed cursed technique — repels enemies.',
        type: 'ranged'
      },
      {
        name: 'Hollow Purple',
        key: '3',
        damage: 65,
        cooldown: 20,
        description: 'Combines Blue & Red. Erases everything in path.',
        type: 'ultimate'
      },
      {
        name: 'Infinity',
        key: '4',
        damage: 0,
        cooldown: 12,
        description: 'Briefly become invulnerable to all attacks.',
        type: 'defense'
      }
    ],
    special: {
      name: 'Teleport Barrage',
      damage: 55,
      cooldown: 22,
      description: 'Short-range consecutive teleports into melee pummeling.'
    },
    awakening: {
      name: 'Limitless Awakened',
      subName: 'The Strongest',
      hpBonus: 0.5,
      moves: [
        {
          name: 'Limitless Blue+',
          key: '1',
          damage: 50,
          cooldown: 5,
          type: 'ranged'
        },
        {
          name: 'Reversal Red',
          key: '2',
          damage: 65,
          cooldown: 8,
          type: 'ranged'
        },
        {
          name: 'Purple Singularity',
          key: '3',
          damage: 100,
          cooldown: 15,
          type: 'aoe'
        },
        {
          name: 'Space Control',
          key: '4',
          damage: 45,
          cooldown: 10,
          type: 'utility'
        }
      ],
      special: {
        name: 'Reversal Red (R)',
        damage: 90,
        cooldown: 0,
        description: 'Fires red rocket with green laser — Black Flash on hit.'
      },
      duration: 60
    }
  },

  {
    id: 'ten_shadows',
    name: 'TEN SHADOWS',
    subName: 'Megumi Fushiguro',
    icon: '🐍',
    badge: null,
    hp: 235,
    color: '#a9e34b',
    description: 'Shikigami summons. Combo techs.',
    moves: [
      {
        name: 'Divine Dog',
        key: '1',
        damage: 30,
        cooldown: 8,
        description: 'Summons Divine Dog to attack the enemy.',
        type: 'summon'
      },
      {
        name: 'Nue (Lightning Bird)',
        key: '2',
        damage: 25,
        cooldown: 7,
        description: 'Electric bird swoops and shocks target.',
        type: 'summon'
      },
      {
        name: 'Toad',
        key: '3',
        damage: 20,
        cooldown: 9,
        description: 'Toad grabs and slams — combo with Nue for secret move.',
        type: 'summon'
      },
      {
        name: 'Shadow Stretch',
        key: '4',
        damage: 18,
        cooldown: 6,
        description: 'Extend shadow to grab and stun the enemy.',
        type: 'utility'
      }
    ],
    special: {
      name: 'Chimera Shadow Garden',
      damage: 50,
      cooldown: 24,
      description: 'Shadow terrain — disorients and damages enemy.'
    },
    awakening: {
      name: 'Mahoraga',
      subName: 'Eight-Handled Wheel',
      hpBonus: 0.6,
      moves: [
        {
          name: 'Wheel Slash',
          key: '1',
          damage: 55,
          cooldown: 6,
          type: 'slash'
        },
        {
          name: 'Adaptation Strike',
          key: '2',
          damage: 45,
          cooldown: 7,
          type: 'melee'
        },
        {
          name: 'Demolish',
          key: '3',
          damage: 80,
          cooldown: 14,
          type: 'aoe'
        },
        {
          name: 'World Cutting Slash',
          key: '4',
          damage: 95,
          cooldown: 18,
          type: 'slash'
        }
      ],
      special: {
        name: 'Divine General Mahoraga',
        damage: 130,
        cooldown: 0,
        description: 'Unleash the eight-handled wheel — catastrophic AoE.'
      },
      duration: 60
    }
  },

  {
    id: 'hakari',
    name: 'HAKARI',
    subName: 'Kinji Hakari',
    icon: '🎰',
    badge: null,
    hp: 265,
    color: '#ffd43b',
    description: 'Jackpot heals. Door barriers.',
    moves: [
      {
        name: 'Door Barricade',
        key: '1',
        damage: 10,
        cooldown: 7,
        description: 'Summon doors to block incoming attacks.',
        type: 'defense'
      },
      {
        name: 'Idle Death Gamble',
        key: '2',
        damage: 40,
        cooldown: 10,
        description: 'High-risk strike with bonus effects.',
        type: 'melee'
      },
      {
        name: 'Jackpot Slam',
        key: '3',
        damage: 35,
        cooldown: 12,
        description: 'Lucky hit — can trigger jackpot healing.',
        type: 'melee'
      },
      {
        name: 'Pachinko Rush',
        key: '4',
        damage: 28,
        cooldown: 8,
        description: 'Rapid bouncing strikes from all angles.',
        type: 'melee'
      }
    ],
    special: {
      name: 'Jackpot!',
      damage: 0,
      cooldown: 20,
      description: 'Triggers Domain — heal massively and boost all damage.',
      heal: 80
    },
    awakening: {
      name: 'Infinite Cursed Energy',
      subName: 'Jackpot Mode',
      hpBonus: 1.0, // full heal
      moves: [
        {
          name: 'Cursed Rush',
          key: '1',
          damage: 45,
          cooldown: 4,
          type: 'melee'
        },
        {
          name: 'Door Storm',
          key: '2',
          damage: 55,
          cooldown: 7,
          type: 'summon'
        },
        {
          name: 'Indestructible',
          key: '3',
          damage: 0,
          cooldown: 10,
          type: 'defense'
        },
        {
          name: 'Grand Finale',
          key: '4',
          damage: 90,
          cooldown: 16,
          type: 'melee'
        }
      ],
      special: {
        name: 'Idle Death Gamble MAX',
        damage: 110,
        cooldown: 0,
        description: 'Invincible, endlessly punches until Jackpot ends.'
      },
      duration: 60
    }
  },

  {
    id: 'perfection',
    name: 'PERFECTION',
    subName: 'Toji Fushiguro',
    icon: '⚔️',
    badge: 'EA',
    hp: 280,
    color: '#ff922b',
    description: 'Zero cursed energy. Pure physical mastery.',
    moves: [
      {
        name: 'Inverted Spear',
        key: '1',
        damage: 38,
        cooldown: 7,
        description: 'Nullifies any technique it touches.',
        type: 'melee'
      },
      {
        name: 'Chain of Heaven',
        key: '2',
        damage: 25,
        cooldown: 8,
        description: 'Binds the enemy temporarily.',
        type: 'utility'
      },
      {
        name: 'Hunter Dash',
        key: '3',
        damage: 30,
        cooldown: 6,
        description: 'Blinding-speed dash strike.',
        type: 'melee'
      },
      {
        name: 'Inventory Draw',
        key: '4',
        damage: 42,
        cooldown: 11,
        description: 'Draws a stored weapon for a surprise hit.',
        type: 'ranged'
      }
    ],
    special: {
      name: 'Heavenly Restriction',
      damage: 60,
      cooldown: 22,
      description: 'Overwhelm with peak human physical ability.'
    },
    awakening: {
      name: 'God of Carnage',
      subName: 'Sorcerer Killer',
      hpBonus: 0.55,
      moves: [
        {
          name: 'Spear of Heaven',
          key: '1',
          damage: 65,
          cooldown: 5,
          type: 'melee'
        },
        {
          name: 'Binding Chain',
          key: '2',
          damage: 40,
          cooldown: 7,
          type: 'utility'
        },
        {
          name: 'Blitz Strike',
          key: '3',
          damage: 75,
          cooldown: 10,
          type: 'melee'
        },
        {
          name: 'Massacre',
          key: '4',
          damage: 95,
          cooldown: 17,
          type: 'aoe'
        }
      ],
      special: {
        name: 'Final Hunt',
        damage: 125,
        cooldown: 0,
        description: 'The ultimate expression of zero cursed energy combat.'
      },
      duration: 60
    }
  },

  {
    id: 'strongest_of_history',
    name: 'STRONGEST',
    subName: 'Heian Sukuna',
    icon: '👹',
    badge: 'OP',
    badgeType: 'op',
    hp: 400,
    color: '#f03e3e',
    description: 'Boss character. Overpowered. Malevolent Shrine.',
    moves: [
      {
        name: 'Ancient Cleave',
        key: '1',
        damage: 55,
        cooldown: 5,
        description: 'A slash from the King of Curses at full power.',
        type: 'slash'
      },
      {
        name: 'Dismantle',
        key: '2',
        damage: 65,
        cooldown: 7,
        description: 'Long-range slashing strikes.',
        type: 'slash'
      },
      {
        name: 'Flame Arrow',
        key: '3',
        damage: 70,
        cooldown: 10,
        description: 'Ancient fire technique.',
        type: 'ranged'
      },
      {
        name: 'Domain Slash',
        key: '4',
        damage: 90,
        cooldown: 15,
        description: 'A preview of the Domain's wrath.',
        type: 'aoe'
      }
    ],
    special: {
      name: 'Malevolent Shrine',
      damage: 150,
      cooldown: 30,
      description: 'Domain Expansion — targets the ENTIRE MAP with relentless slashes.'
    },
    awakening: {
      name: 'True Form Sukuna',
      subName: 'Undisputed King',
      hpBonus: 1.0,
      moves: [
        {
          name: 'Mythical Cleave',
          key: '1',
          damage: 80,
          cooldown: 4,
          type: 'slash'
        },
        {
          name: 'Open',
          key: '2',
          damage: 100,
          cooldown: 8,
          type: 'aoe'
        },
        {
          name: 'Cursed Flame',
          key: '3',
          damage: 90,
          cooldown: 10,
          type: 'ranged'
        },
        {
          name: 'World End Slash',
          key: '4',
          damage: 120,
          cooldown: 18,
          type: 'slash'
        }
      ],
      special: {
        name: 'Unlimited Shrine',
        damage: 200,
        cooldown: 0,
        description: 'The full power of Malevolent Shrine — inescapable.'
      },
      duration: 60
    }
  }
];

/* =============================================================
   BOSSES — Roulette / Final Showdown style boss enemies
   Each boss has phases (phase 0 = normal, phase 1 = enraged at 50% HP)
   ============================================================= */
const BOSSES = [
  {
    id: 'boss_sukuna',
    name: 'RYOMEN SUKUNA',
    subName: 'True King of Curses',
    isBoss: true,
    icon: '👹',
    hp: 1200,
    color: '#ff1744',
    glowColor: '#ff000088',
    scale: 1.4,
    description: 'The undisputed King of Curses. Four arms. No mercy.',
    phases: [
      {
        threshold: 1.0,
        label: 'KING OF CURSES',
        moves: [
          { name: 'Cleave', key: '1', damage: 60, cooldown: 4, type: 'slash' },
          { name: 'Dismantle', key: '2', damage: 80, cooldown: 6, type: 'slash' },
          { name: 'Flame Arrow', key: '3', damage: 75, cooldown: 9, type: 'ranged' },
          { name: 'Domain Slash', key: '4', damage: 95, cooldown: 14, type: 'aoe' }
        ],
        special: { name: 'Malevolent Shrine', damage: 160, cooldown: 30 }
      },
      {
        threshold: 0.5,
        label: 'TRUE FORM — ENRAGED',
        enraged: true,
        moves: [
          { name: 'World Cleave', key: '1', damage: 90, cooldown: 3, type: 'slash' },
          { name: 'Open', key: '2', damage: 120, cooldown: 5, type: 'aoe' },
          { name: 'Cursed Flame', key: '3', damage: 100, cooldown: 7, type: 'ranged' },
          { name: 'Twin Meteors', key: '4', damage: 140, cooldown: 12, type: 'slash' }
        ],
        special: { name: 'Unlimited Shrine', damage: 220, cooldown: 25 }
      }
    ]
  },

  {
    id: 'boss_gojo',
    name: 'UNLIMITED GOJO',
    subName: 'The Honored One — Unsealed',
    isBoss: true,
    icon: '🌀',
    hp: 1000,
    color: '#00b0ff',
    glowColor: '#00b0ff88',
    scale: 1.3,
    description: 'Infinity active at all times. The Strongest returns.',
    phases: [
      {
        threshold: 1.0,
        label: 'INFINITY ACTIVE',
        moves: [
          { name: 'Lapse Blue MAX', key: '1', damage: 65, cooldown: 5, type: 'ranged' },
          { name: 'Reversal Red', key: '2', damage: 75, cooldown: 7, type: 'ranged' },
          { name: 'Hollow Purple', key: '3', damage: 110, cooldown: 18, type: 'aoe' },
          { name: 'Infinity Shield', key: '4', damage: 0, cooldown: 10, type: 'defense' }
        ],
        special: { name: 'Teleport Barrage', damage: 130, cooldown: 22 }
      },
      {
        threshold: 0.5,
        label: 'SIX EYES — UNLEASHED',
        enraged: true,
        moves: [
          { name: 'Blue Singularity', key: '1', damage: 95, cooldown: 4, type: 'ranged' },
          { name: 'Red Rocket', key: '2', damage: 105, cooldown: 6, type: 'ranged' },
          { name: 'Purple Nova', key: '3', damage: 160, cooldown: 14, type: 'aoe' },
          { name: 'Infinite Void', key: '4', damage: 40, cooldown: 8, type: 'aoe' }
        ],
        special: { name: 'Infinite Void Domain', damage: 200, cooldown: 20 }
      }
    ]
  },

  {
    id: 'boss_mahoraga',
    name: 'DIVINE GENERAL',
    subName: 'Mahoraga — Eight-Handled Wheel',
    isBoss: true,
    icon: '⚙️',
    hp: 900,
    color: '#69db7c',
    glowColor: '#00ff4488',
    scale: 1.5,
    description: 'Adapts to everything. Grows stronger with every hit.',
    phases: [
      {
        threshold: 1.0,
        label: 'ADAPTATION I',
        moves: [
          { name: 'Wheel Slash', key: '1', damage: 70, cooldown: 5, type: 'slash' },
          { name: 'Adaptation Strike', key: '2', damage: 55, cooldown: 6, type: 'melee' },
          { name: 'Demolish', key: '3', damage: 90, cooldown: 12, type: 'aoe' },
          { name: 'Sumo Throw', key: '4', damage: 65, cooldown: 9, type: 'melee' }
        ],
        special: { name: 'Eight-Handled Wheel', damage: 150, cooldown: 28 }
      },
      {
        threshold: 0.5,
        label: 'ADAPTATION II — PERFECTED',
        enraged: true,
        damageResist: 0.35,
        moves: [
          { name: 'World Cutting Slash', key: '1', damage: 110, cooldown: 4, type: 'slash' },
          { name: 'Counter Instinct', key: '2', damage: 80, cooldown: 5, type: 'counter' },
          { name: 'Cataclysm', key: '3', damage: 130, cooldown: 10, type: 'aoe' },
          { name: 'Inevitable End', key: '4', damage: 150, cooldown: 14, type: 'slash' }
        ],
        special: { name: 'Divine Demolition', damage: 210, cooldown: 22 }
      }
    ]
  }
];
