import { companionVisuals, type CompanionVisual } from './companionVisuals';
import type { CompanionKind } from '../services/companionService';

// Original transparent atlases stay intact; viewports contain each complete silhouette.
type AtlasCell = { rect: [number, number, number, number]; eyes: [number, number, number, number][] };
const explorer: Record<CompanionKind, AtlasCell> = {
  "bird": {
    "rect": [
      0,
      0,
      438,
      470
    ],
    "eyes": [
      [
        181,
        205,
        7,
        10
      ],
      [
        284,
        218,
        7,
        10
      ]
    ]
  },
  "cat": {
    "rect": [
      438,
      0,
      434,
      470
    ],
    "eyes": [
      [
        678,
        188,
        22,
        26
      ],
      [
        802,
        169,
        17,
        23
      ]
    ]
  },
  "dog": {
    "rect": [
      872,
      0,
      492,
      470
    ],
    "eyes": [
      [
        1159,
        215,
        17.5,
        22
      ],
      [
        1278,
        205,
        10.5,
        19
      ]
    ]
  },
  "pig": {
    "rect": [
      1364,
      0,
      410,
      470
    ],
    "eyes": [
      [
        1569,
        228,
        18,
        23
      ],
      [
        1716,
        213,
        13,
        20
      ]
    ]
  },
  "penguin": {
    "rect": [
      0,
      470,
      454,
      417
    ],
    "eyes": [
      [
        205,
        563,
        20,
        24
      ],
      [
        320,
        550,
        14,
        21
      ]
    ]
  },
  "owl": {
    "rect": [
      454,
      470,
      416,
      417
    ],
    "eyes": [
      [
        641,
        584,
        20,
        25
      ],
      [
        782,
        574,
        17,
        22
      ]
    ]
  },
  "seagull": {
    "rect": [
      870,
      470,
      471,
      417
    ],
    "eyes": [
      [
        1118,
        565,
        18,
        23
      ],
      [
        1220,
        552,
        12,
        20
      ]
    ]
  },
  "dolphin": {
    "rect": [
      1341,
      470,
      433,
      417
    ],
    "eyes": [
      [
        1628,
        546,
        20,
        24
      ]
    ]
  }
};
const mature: Record<CompanionKind, AtlasCell> = {
  "bird": {
    "rect": [
      0,
      0,
      423,
      458
    ],
    "eyes": [
      [
        173,
        213,
        7.5,
        11
      ],
      [
        281,
        230,
        7.5,
        11
      ]
    ]
  },
  "cat": {
    "rect": [
      423,
      0,
      478,
      458
    ],
    "eyes": [
      [
        718,
        248,
        22,
        26
      ],
      [
        852,
        237,
        15,
        24
      ]
    ]
  },
  "dog": {
    "rect": [
      901,
      0,
      448,
      458
    ],
    "eyes": [
      [
        1135,
        206,
        19,
        24
      ],
      [
        1256,
        195,
        11,
        20
      ]
    ]
  },
  "pig": {
    "rect": [
      1349,
      0,
      425,
      458
    ],
    "eyes": [
      [
        1540,
        255,
        20,
        24
      ],
      [
        1707,
        238,
        14,
        22
      ]
    ]
  },
  "penguin": {
    "rect": [
      0,
      458,
      437,
      429
    ],
    "eyes": [
      [
        190,
        555,
        19,
        24
      ],
      [
        312,
        551,
        14,
        22
      ]
    ]
  },
  "owl": {
    "rect": [
      437,
      458,
      453,
      429
    ],
    "eyes": [
      [
        635,
        574,
        22,
        27
      ],
      [
        793,
        568,
        18,
        24
      ]
    ]
  },
  "seagull": {
    "rect": [
      890,
      458,
      450,
      429
    ],
    "eyes": [
      [
        1133,
        558,
        17,
        22
      ],
      [
        1260,
        550,
        11,
        19
      ]
    ]
  },
  "dolphin": {
    "rect": [
      1340,
      458,
      434,
      429
    ],
    "eyes": [
      [
        1606,
        542,
        22,
        26
      ]
    ]
  }
};

export function getGrowthVisual(kind: CompanionKind, stage: 0 | 1 | 2): CompanionVisual {
  if (stage === 0) return companionVisuals[kind];
  const cell = (stage === 1 ? explorer : mature)[kind];
  const [x, y, width, height] = cell.rect;
  const scale = 1000 / Math.max(width, height);
  const padX = (1000 - width * scale) / 2;
  const padY = (1000 - height * scale) / 2;
  return {
    src: '/assets/companions/generated/growth-' + (stage === 1 ? 'explorer' : 'mature') + '-atlas-v3.png',
    crop: { x, y, width, height, atlasWidth: 1774, atlasHeight: 887 },
    liveEyes: true,
    eyeColor: kind === 'bird' ? '#2c3644' : kind === 'dolphin' ? '#49576b' : '#58433e',
    eyes: cell.eyes.map(([ex, ey, rx, ry]) => ({ x: (ex - x) * scale + padX, y: (ey - y) * scale + padY, rx: rx * scale, ry: ry * scale })),
  };
}
