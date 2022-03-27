export const fileTypes = {
  clothes: {
    extension: '.clo',
    pathSegments: ['Resource', 'Clothes'],
  },
  dogz: {
    extension: '.dog',
    pathSegments: ['Resource', 'Dogz'],
  },
  catz: {
    extension: '.cat',
    pathSegments: ['Resource', 'Catz'],
  },
} as const;

export type FileType = keyof typeof fileTypes;
