export const fileTypes = {
  catz: {
    extension: '.cat',
    pathSegments: ['Resource', 'Catz'],
  },
  dogz: {
    extension: '.dog',
    pathSegments: ['Resource', 'Dogz'],
  },
  clothes: {
    extension: '.clo',
    pathSegments: ['Resource', 'Clothes'],
  },
} as const;

export type FileType = keyof typeof fileTypes;
