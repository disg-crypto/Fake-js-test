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
    hp: 220,
    color: '#ff6b6b',
    description: 'Fast M1s. Counter-heavy playstyle.',
    moves: [
      {
        name: 'Divergent Fist',
        key: '1',
        damage: 25,
        cooldown: 4,
        description: 'Delayed cursed energy launches opponent back.',
        type: 'melee'
      },
      {
        name: 'Manji Kick',
        key: '2',
        damage: 21,
        cooldown: 6,
        description: 'Counter move — lunges toward enemy and kicks.',
        type: 'counter'
      },
      {
        name: 'Black Flash',
        key: '3',
        damage: 40,
        cooldown: 10,
        description: 'Cursed energy concentrates at point of impact.',
        type: 'melee'
      },
      {
        name: 'Boogie Woogie',
        key: '4',
        damage: 17,
        cooldown: 7,
        description: 'Swap positions with a target instantly.',
        type: 'utility'
      }
    ],
    special: {
      name: 'Hollow Wicker Basket',
      damage: 52,
      cooldown: 20,
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
          damage: 46,
          cooldown: 4,
          type: 'slash'
        },
        {
          name: 'Dismantle',
          key: '2',
          damage: 63,
          cooldown: 7,
          type: 'slash'
        },
        {
          name: 'Flame Arrow',
          key: '3',
          damage: 55,
          cooldown: 9,
          type: 'ranged'
        },
        {
          name: 'World Slash',
          key: '4',
          damage: 80,
          cooldown: 14,
          type: 'aoe'
        }
      ],
      special: {
        name: 'Malevolent Shrine',
        damage: 138,
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
    hp: 270,
    color: '#74c0fc',
    description: 'Teleport combos. Infinity blocks.',
    moves: [
      {
        name: 'Blue',
        key: '1',
        damage: 32,
        cooldown: 5,
        description: 'Cursed technique lapse — pulls enemies in.',
        type: 'ranged'
      },
      {
        name: 'Red',
        key: '2',
        damage: 37,
        cooldown: 6,
        description: 'Reversed cursed technique — repels enemies.',
        type: 'ranged'
      },
      {
        name: 'Hollow Purple',
        key: '3',
        damage: 75,
        cooldown: 14,
        description: 'Combines Blue & Red. Erases everything in path.',
        type: 'ultimate'
      },
      {
        name: 'Infinity',
        key: '4',
        damage: 0,
        cooldown: 8,
        description: 'Briefly become invulnerable to all attacks.',
        type: 'defense'
      }
    ],
    special: {
      name: 'Teleport Barrage',
      damage: 63,
      cooldown: 18,
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
          damage: 58,
          cooldown: 4,
          type: 'ranged'
        },
        {
          name: 'Reversal Red',
          key: '2',
          damage: 75,
          cooldown: 6,
          type: 'ranged'
        },
        {
          name: 'Purple Singularity',
          key: '3',
          damage: 115,
          cooldown: 11,
          type: 'aoe'
        },
        {
          name: 'Space Control',
          key: '4',
          damage: 52,
          cooldown: 8,
          type: 'utility'
        }
      ],
      special: {
        name: 'Reversal Red (R)',
        damage: 104,
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
    hp: 210,
    color: '#a9e34b',
    description: 'Shikigami summons. Combo techs.',
    moves: [
      {
        name: 'Divine Dog',
        key: '1',
        damage: 35,
        cooldown: 6,
        description: 'Summons Divine Dog to attack the enemy.',
        type: 'summon'
      },
      {
        name: 'Nue (Lightning Bird)',
        key: '2',
        damage: 29,
        cooldown: 5,
        description: 'Electric bird swoops and shocks target.',
        type: 'summon'
      },
      {
        name: 'Toad',
        key: '3',
        damage: 23,
        cooldown: 6,
        description: 'Toad grabs and slams — combo with Nue for secret move.',
        type: 'summon'
      },
      {
        name: 'Shadow Stretch',
        key: '4',
        damage: 21,
        cooldown: 4,
        description: 'Extend shadow to grab and stun the enemy.',
        type: 'utility'
      }
    ],
    special: {
      name: 'Chimera Shadow Garden',
      damage: 58,
      cooldown: 19,
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
          damage: 63,
          cooldown: 5,
          type: 'slash'
        },
        {
          name: 'Adaptation Strike',
          key: '2',
          damage: 52,
          cooldown: 5,
          type: 'melee'
        },
        {
          name: 'Demolish',
          key: '3',
          damage: 92,
          cooldown: 11,
          type: 'aoe'
        },
        {
          name: 'World Cutting Slash',
          key: '4',
          damage: 109,
          cooldown: 14,
          type: 'slash'
        }
      ],
      special: {
        name: 'Divine General Mahoraga',
        damage: 150,
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
    hp: 240,
    color: '#ffd43b',
    description: 'Jackpot heals. Door barriers.',
    moves: [
      {
        name: 'Door Barricade',
        key: '1',
        damage: 12,
        cooldown: 5,
        description: 'Summon doors to block incoming attacks.',
        type: 'defense'
      },
      {
        name: 'Idle Death Gamble',
        key: '2',
        damage: 46,
        cooldown: 7,
        description: 'High-risk strike with bonus effects.',
        type: 'melee'
      },
      {
        name: 'Jackpot Slam',
        key: '3',
        damage: 40,
        cooldown: 8,
        description: 'Lucky hit — can trigger jackpot healing.',
        type: 'melee'
      },
      {
        name: 'Pachinko Rush',
        key: '4',
        damage: 32,
        cooldown: 6,
        description: 'Rapid bouncing strikes from all angles.',
        type: 'melee'
      }
    ],
    special: {
      name: 'Jackpot!',
      damage: 0,
      cooldown: 16,
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
          damage: 52,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Door Storm',
          key: '2',
          damage: 63,
          cooldown: 5,
          type: 'summon'
        },
        {
          name: 'Indestructible',
          key: '3',
          damage: 0,
          cooldown: 8,
          type: 'defense'
        },
        {
          name: 'Grand Finale',
          key: '4',
          damage: 104,
          cooldown: 12,
          type: 'melee'
        }
      ],
      special: {
        name: 'Idle Death Gamble MAX',
        damage: 127,
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
    hp: 250,
    color: '#ff922b',
    description: 'Zero cursed energy. Pure physical mastery.',
    moves: [
      {
        name: 'Inverted Spear',
        key: '1',
        damage: 44,
        cooldown: 5,
        description: 'Nullifies any technique it touches.',
        type: 'melee'
      },
      {
        name: 'Chain of Heaven',
        key: '2',
        damage: 29,
        cooldown: 6,
        description: 'Binds the enemy temporarily.',
        type: 'utility'
      },
      {
        name: 'Hunter Dash',
        key: '3',
        damage: 35,
        cooldown: 4,
        description: 'Blinding-speed dash strike.',
        type: 'melee'
      },
      {
        name: 'Inventory Draw',
        key: '4',
        damage: 48,
        cooldown: 8,
        description: 'Draws a stored weapon for a surprise hit.',
        type: 'ranged'
      }
    ],
    special: {
      name: 'Heavenly Restriction',
      damage: 69,
      cooldown: 18,
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
          damage: 75,
          cooldown: 4,
          type: 'melee'
        },
        {
          name: 'Binding Chain',
          key: '2',
          damage: 46,
          cooldown: 5,
          type: 'utility'
        },
        {
          name: 'Blitz Strike',
          key: '3',
          damage: 86,
          cooldown: 8,
          type: 'melee'
        },
        {
          name: 'Massacre',
          key: '4',
          damage: 109,
          cooldown: 13,
          type: 'aoe'
        }
      ],
      special: {
        name: 'Final Hunt',
        damage: 144,
        cooldown: 0,
        description: 'The ultimate expression of zero cursed energy combat.'
      },
      duration: 60
    }
  },

  {
    id: 'kashimo',
    name: 'KASHIMO',
    subName: 'Hajime Kashimo',
    icon: '⚡',
    badge: null,
    hp: 235,
    color: '#00e5ff',
    description: 'Lightning sorcerer from 400 years ago. One-shot potential.',
    moves: [
      {
        name: 'Lightning Discharge',
        key: '1',
        damage: 37,
        cooldown: 4,
        description: 'Electrifies fists for a shocking melee strike.',
        type: 'melee'
      },
      {
        name: 'Electrify',
        key: '2',
        damage: 32,
        cooldown: 5,
        description: 'Charges body with lightning — next hit deals bonus damage.',
        type: 'utility'
      },
      {
        name: 'Thunder Strike',
        key: '3',
        damage: 58,
        cooldown: 8,
        description: 'Calls down a bolt of lightning on the enemy.',
        type: 'ranged'
      },
      {
        name: 'Genju Kohasaku',
        key: '4',
        damage: 52,
        cooldown: 7,
        description: 'Generates electricity between strikes for a guaranteed hit.',
        type: 'melee'
      }
    ],
    special: {
      name: 'Mythical Beast Amber',
      damage: 98,
      cooldown: 19,
      description: 'True form — transforms body into pure lightning for one devastating attack.'
    },
    awakening: {
      name: 'True Essence of Lightning',
      subName: 'Mythical Beast',
      hpBonus: 0.6,
      moves: [
        {
          name: 'Storm Fist',
          key: '1',
          damage: 69,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Chain Lightning',
          key: '2',
          damage: 63,
          cooldown: 5,
          type: 'ranged'
        },
        {
          name: 'Thunderclap',
          key: '3',
          damage: 92,
          cooldown: 8,
          type: 'aoe'
        },
        {
          name: 'Lightning God',
          key: '4',
          damage: 115,
          cooldown: 12,
          type: 'aoe'
        }
      ],
      special: {
        name: 'Final Lightning',
        damage: 161,
        cooldown: 0,
        description: 'Releases all stored electricity in one final blast. Destroys the user.'
      },
      duration: 45
    }
  },

  {
    id: 'takaba',
    name: 'COMEDIAN',
    subName: 'Fumihiko Takaba',
    icon: '🤣',
    badge: null,
    hp: 270,
    color: '#ff6f91',
    description: 'If he thinks it\'s funny, it becomes reality.',
    moves: [
      {
        name: 'Slapstick',
        key: '1',
        damage: 23,
        cooldown: 4,
        description: 'Slaps opponent with comedic timing — guaranteed knockback.',
        type: 'melee'
      },
      {
        name: 'Banana Peel',
        key: '2',
        damage: 17,
        cooldown: 6,
        description: 'Opponent trips and takes stun damage.',
        type: 'counter'
      },
      {
        name: 'Pie to the Face',
        key: '3',
        damage: 29,
        cooldown: 6,
        description: 'Launches a cream pie projectile. Hilarious and effective.',
        type: 'ranged'
      },
      {
        name: 'Comedian\'s Resolve',
        key: '4',
        damage: 0,
        cooldown: 10,
        description: 'Believes damage is funny — heals 40 HP.',
        type: 'defense',
        heal: 40
      }
    ],
    special: {
      name: 'Showstopper',
      damage: 69,
      cooldown: 16,
      description: 'The ultimate punchline — reality bends to his comedy.'
    },
    awakening: {
      name: 'Stand-Up King',
      subName: 'Peak Comedy',
      hpBonus: 0.8,
      moves: [
        {
          name: 'Knock Knock',
          key: '1',
          damage: 40,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Plot Armor',
          key: '2',
          damage: 0,
          cooldown: 6,
          type: 'defense'
        },
        {
          name: 'Laugh Track',
          key: '3',
          damage: 58,
          cooldown: 8,
          type: 'aoe'
        },
        {
          name: 'Comedy Gold',
          key: '4',
          damage: 86,
          cooldown: 11,
          type: 'melee'
        }
      ],
      special: {
        name: 'Reality Overwrite',
        damage: 115,
        cooldown: 0,
        description: 'If Takaba thinks it, it happens. No exceptions.'
      },
      duration: 50
    }
  },

  {
    id: 'yuta',
    name: 'COPY',
    subName: 'Yuta Okkotsu',
    icon: '💍',
    badge: 'EA',
    hp: 285,
    color: '#b388ff',
    description: 'Special Grade. Rika grants unlimited cursed energy.',
    moves: [
      {
        name: 'Rika Slash',
        key: '1',
        damage: 40,
        cooldown: 4,
        description: 'Rika manifests to deliver a cursed sword strike.',
        type: 'slash'
      },
      {
        name: 'Cursed Speech',
        key: '2',
        damage: 23,
        cooldown: 6,
        description: 'Copied from Inumaki — commands enemy to stop.',
        type: 'counter'
      },
      {
        name: 'Reverse Cursed',
        key: '3',
        damage: 0,
        cooldown: 8,
        description: 'Heals 50 HP using reverse cursed technique.',
        type: 'defense',
        heal: 50
      },
      {
        name: 'Copy Technique',
        key: '4',
        damage: 52,
        cooldown: 7,
        description: 'Copies a random enemy technique for massive damage.',
        type: 'ranged'
      }
    ],
    special: {
      name: 'Pure Love: Rika',
      damage: 92,
      cooldown: 18,
      description: 'Fully manifests Rika — devastating close-range barrage.'
    },
    awakening: {
      name: 'Queen of Curses',
      subName: 'Full Manifestation Rika',
      hpBonus: 0.65,
      moves: [
        {
          name: 'Rika Claw',
          key: '1',
          damage: 69,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Copied Domain',
          key: '2',
          damage: 81,
          cooldown: 6,
          type: 'aoe'
        },
        {
          name: 'Cursed Megaphone',
          key: '3',
          damage: 63,
          cooldown: 5,
          type: 'ranged'
        },
        {
          name: 'Boundless CE',
          key: '4',
          damage: 104,
          cooldown: 11,
          type: 'slash'
        }
      ],
      special: {
        name: 'Jacob\'s Ladder',
        damage: 150,
        cooldown: 0,
        description: 'Channels all of Rika\'s power into an annihilating beam.'
      },
      duration: 55
    }
  },

  {
    id: 'maki',
    name: 'ZENIN',
    subName: 'Maki Zenin',
    icon: '🗡️',
    badge: null,
    hp: 215,
    color: '#2ed573',
    description: 'Zero cursed energy. Enhanced physical senses. Dragon Bone.',
    moves: [
      {
        name: 'Dragon Bone',
        key: '1',
        damage: 40,
        cooldown: 4,
        description: 'Special grade cursed tool — powerful polearm strike.',
        type: 'melee'
      },
      {
        name: 'Split Soul Katana',
        key: '2',
        damage: 32,
        cooldown: 5,
        description: 'Cuts the soul directly — bypasses defenses.',
        type: 'slash'
      },
      {
        name: 'Playful Cloud',
        key: '3',
        damage: 52,
        cooldown: 8,
        description: 'Three-section staff deals scaling damage based on power.',
        type: 'melee'
      },
      {
        name: 'Weapon Throw',
        key: '4',
        damage: 25,
        cooldown: 4,
        description: 'Hurls a cursed weapon with pinpoint accuracy.',
        type: 'ranged'
      }
    ],
    special: {
      name: 'Heavenly Restriction: Zero',
      damage: 75,
      cooldown: 18,
      description: 'Peak physical form — blinding speed multi-hit combo.'
    },
    awakening: {
      name: 'Clan Destroyer',
      subName: 'Toji-Level Power',
      hpBonus: 0.5,
      moves: [
        {
          name: 'Dragon Pierce',
          key: '1',
          damage: 63,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Soul Rend',
          key: '2',
          damage: 75,
          cooldown: 5,
          type: 'slash'
        },
        {
          name: 'Annihilate',
          key: '3',
          damage: 92,
          cooldown: 9,
          type: 'aoe'
        },
        {
          name: 'Zen\'in Massacre',
          key: '4',
          damage: 109,
          cooldown: 12,
          type: 'slash'
        }
      ],
      special: {
        name: 'True Heavenly Restriction',
        damage: 138,
        cooldown: 0,
        description: 'Surpasses Toji — obliterates everything in her path.'
      },
      duration: 50
    }
  },

  {
    id: 'choso',
    name: 'BLOOD',
    subName: 'Choso',
    icon: '🩸',
    badge: null,
    hp: 245,
    color: '#e03131',
    description: 'Death Painting. Blood manipulation master.',
    moves: [
      {
        name: 'Piercing Blood',
        key: '1',
        damage: 44,
        cooldown: 5,
        description: 'Fires a high-pressure blood beam at incredible speed.',
        type: 'ranged'
      },
      {
        name: 'Convergence',
        key: '2',
        damage: 29,
        cooldown: 4,
        description: 'Compresses blood to maximum density for next attack.',
        type: 'utility'
      },
      {
        name: 'Supernova',
        key: '3',
        damage: 58,
        cooldown: 8,
        description: 'Blood orb detonation — AoE explosion.',
        type: 'aoe'
      },
      {
        name: 'Blood Edge',
        key: '4',
        damage: 35,
        cooldown: 6,
        description: 'Forms blood into a sharp blade for close combat.',
        type: 'slash'
      }
    ],
    special: {
      name: 'Blood Meteorite',
      damage: 81,
      cooldown: 18,
      description: 'Massive compressed blood projectile — devastating on impact.'
    },
    awakening: {
      name: 'Death Painting Unleashed',
      subName: 'Eldest Brother',
      hpBonus: 0.7,
      moves: [
        {
          name: 'Crimson Beam',
          key: '1',
          damage: 63,
          cooldown: 4,
          type: 'ranged'
        },
        {
          name: 'Blood Armor',
          key: '2',
          damage: 0,
          cooldown: 6,
          type: 'defense'
        },
        {
          name: 'Supernova MAX',
          key: '3',
          damage: 98,
          cooldown: 8,
          type: 'aoe'
        },
        {
          name: 'Flowing Red Scale',
          key: '4',
          damage: 81,
          cooldown: 9,
          type: 'melee'
        }
      ],
      special: {
        name: 'Wing King',
        damage: 132,
        cooldown: 0,
        description: 'Splits blood in all directions — inescapable barrage.'
      },
      duration: 55
    }
  },

  {
    id: 'naoya',
    name: 'PROJECTION',
    subName: 'Naoya Zenin',
    icon: '💨',
    badge: 'EA',
    hp: 220,
    color: '#20c997',
    description: 'Projection Sorcery. Moves in 24fps. Blindingly fast.',
    moves: [
      {
        name: 'Frame Skip',
        key: '1',
        damage: 32,
        cooldown: 4,
        description: 'Moves faster than the eye can track — instant teleport strike.',
        type: 'melee'
      },
      {
        name: 'Freeze Frame',
        key: '2',
        damage: 23,
        cooldown: 6,
        description: 'Touches enemy — freezes them for 1 second if they break the rule.',
        type: 'counter'
      },
      {
        name: 'Speed Blitz',
        key: '3',
        damage: 46,
        cooldown: 7,
        description: 'Multi-hit rapid strikes at projection speed.',
        type: 'melee'
      },
      {
        name: 'Air Frame',
        key: '4',
        damage: 37,
        cooldown: 5,
        description: 'Creates air pressure frames — ranged shockwave attack.',
        type: 'ranged'
      }
    ],
    special: {
      name: 'Cursed Spirit: Worm',
      damage: 69,
      cooldown: 16,
      description: 'Transforms into venomous cursed spirit form — pure speed.'
    },
    awakening: {
      name: 'Vengeful Spirit',
      subName: 'Cursed Worm',
      hpBonus: 0.55,
      moves: [
        {
          name: 'Worm Dive',
          key: '1',
          damage: 58,
          cooldown: 3,
          type: 'melee'
        },
        {
          name: 'Venom Spit',
          key: '2',
          damage: 52,
          cooldown: 5,
          type: 'ranged'
        },
        {
          name: 'Sonic Boom',
          key: '3',
          damage: 81,
          cooldown: 8,
          type: 'aoe'
        },
        {
          name: 'Terminal Velocity',
          key: '4',
          damage: 98,
          cooldown: 11,
          type: 'melee'
        }
      ],
      special: {
        name: 'Beyond Light Speed',
        damage: 127,
        cooldown: 0,
        description: 'Exceeds the 24fps limit — moves faster than reality.'
      },
      duration: 45
    }
  },

  {
    id: 'strongest_of_history',
    name: 'STRONGEST',
    subName: 'Heian Sukuna',
    icon: '👹',
    badge: 'OP',
    badgeType: 'op',
    hp: 350,
    color: '#f03e3e',
    description: 'Boss character. Overpowered. Malevolent Shrine.',
    moves: [
      {
        name: 'Ancient Cleave',
        key: '1',
        damage: 63,
        cooldown: 4,
        description: 'A slash from the King of Curses at full power.',
        type: 'slash'
      },
      {
        name: 'Dismantle',
        key: '2',
        damage: 75,
        cooldown: 5,
        description: 'Long-range slashing strikes.',
        type: 'slash'
      },
      {
        name: 'Flame Arrow',
        key: '3',
        damage: 81,
        cooldown: 7,
        description: 'Ancient fire technique.',
        type: 'ranged'
      },
      {
        name: 'Domain Slash',
        key: '4',
        damage: 104,
        cooldown: 11,
        description: "A preview of the Domain's wrath.",
        type: 'aoe'
      }
    ],
    special: {
      name: 'Malevolent Shrine',
      damage: 173,
      cooldown: 24,
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
          damage: 92,
          cooldown: 3,
          type: 'slash'
        },
        {
          name: 'Open',
          key: '2',
          damage: 115,
          cooldown: 6,
          type: 'aoe'
        },
        {
          name: 'Cursed Flame',
          key: '3',
          damage: 104,
          cooldown: 8,
          type: 'ranged'
        },
        {
          name: 'World End Slash',
          key: '4',
          damage: 138,
          cooldown: 14,
          type: 'slash'
        }
      ],
      special: {
        name: 'Unlimited Shrine',
        damage: 230,
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
