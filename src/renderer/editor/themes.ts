import { tags as t } from '@lezer/highlight';

import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import {
  HighlightStyle,
  syntaxHighlighting,
  TagStyle,
} from '@codemirror/language';

interface Options {
  /**
   * Theme variant. Determines which styles CodeMirror will apply by default.
   */
  variant: Variant;

  /**
   * Settings to customize the look of the editor, like background, gutter, selection and others.
   */
  settings: Settings;

  /**
   * Syntax highlighting styles.
   */
  styles: TagStyle[];
}

type Variant = 'light' | 'dark';

interface Settings {
  /**
   * Editor background.
   */
  background: string;

  /**
   * Default text color.
   */
  foreground: string;

  /**
   * Caret color.
   */
  caret: string;

  /**
   * Selection background.
   */
  selection: string;

  searchMatch: string;
  searchMatchOutline: string;

  searchMatchSelected: string;
  activeLine: string;

  selectionMatch: string;
  matchingBrackets: string;

  /**
   * Gutter background.
   */
  gutterBackground: string;

  /**
   * Text color inside gutter.
   */
  gutterForeground: string;

  activeGutter: string;
}

const createTheme = ({ variant, settings, styles }: Options): Extension => {
  const theme = EditorView.theme(
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '&': {
        backgroundColor: settings.background,
        color: settings.foreground,
      },
      '.cm-content': {
        caretColor: settings.caret,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: settings.caret,
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: settings.selection,
        },
      '.cm-panels': {
        backgroundColor: settings.background,
        color: settings.foreground,
      },
      '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
      '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },

      '.cm-searchMatch': {
        backgroundColor: settings.searchMatch,
        outline: `1px solid ${settings.searchMatchOutline}`,
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: settings.searchMatchSelected,
      },

      '.cm-activeLine': { backgroundColor: settings.activeLine },
      '.cm-selectionMatch': { backgroundColor: settings.selectionMatch },

      '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: settings.matchingBrackets,
      },

      '.cm-gutters': {
        backgroundColor: settings.gutterBackground,
        color: settings.gutterForeground,
      },
      '.cm-activeLineGutter': {
        backgroundColor: settings.activeGutter,
      },
    },
    {
      dark: variant === 'dark',
    }
  );

  const highlightStyle = HighlightStyle.define(styles);
  const extension = [theme, syntaxHighlighting(highlightStyle)];

  return extension;
};

export const darkTheme = createTheme({
  variant: 'dark',
  settings: {
    background: '#2d2f3f',
    foreground: '#f8f8f2',
    caret: '#f8f8f0',
    selection: '#664259',
    searchMatch: '#6d5ad9',
    searchMatchOutline: '#ffffff00',
    searchMatchSelected: '#0b9b85',
    activeLine: '#7b7f9b59',
    selectionMatch: '#3e6b7c',
    matchingBrackets: '#ffffff00',
    gutterBackground: '#282a36',
    gutterForeground: 'rgb(144, 145, 148)',
    activeGutter: 'rgba(123,127,155,0.19)',
  },
  styles: [
    {
      tag: t.comment,
      color: '#a9eaff',
    },
    {
      tag: [t.string, t.special(t.brace)],
      color: '#f1fa8c',
    },
    {
      tag: [t.number, t.self, t.bool, t.null],
      color: '#bd93f9',
    },
    {
      tag: [t.keyword, t.operator],
      color: '#ff79c6',
    },
    {
      tag: [t.definitionKeyword, t.typeName],
      color: '#8be9fd',
    },
    {
      tag: t.definition(t.typeName),
      color: '#f8f8f2',
    },
    {
      tag: [
        t.className,
        t.definition(t.propertyName),
        t.function(t.variableName),
        t.attributeName,
        t.namespace,
      ],
      color: '#ff90c3',
      fontWeight: 'bold',
    },
  ],
});

export const lightTheme = createTheme({
  variant: 'light',
  settings: {
    background: '#FFFFFF',
    foreground: '#000000',
    caret: '#000000',
    selection: '#b6bdd7',
    searchMatch: '#f7d3f6',
    searchMatchOutline: '#ffffff00',
    searchMatchSelected: '#b8bdff',
    activeLine: 'rgba(211,238,255,0.42)',
    selectionMatch: '#dfddff',
    matchingBrackets: '#ffffff00',
    gutterBackground: '#FFFFFF',
    gutterForeground: '#00000070',
    activeGutter: 'rgba(219,240,255,0.25)',
  },
  styles: [
    {
      tag: t.comment,
      color: '#3875c1',
    },
    {
      tag: [t.keyword, t.operator, t.typeName, t.tagName, t.propertyName],
      color: '#2F6F9F',
      fontWeight: 'bold',
    },
    {
      tag: [t.attributeName, t.definition(t.propertyName)],
      color: '#4F9FD0',
    },
    {
      tag: [t.className, t.string, t.special(t.brace), t.namespace],
      color: '#36628b',
      fontWeight: 'bold',
    },
    {
      tag: t.number,
      color: '#CF4F5F',
      fontWeight: 'bold',
    },
    {
      tag: t.variableName,
      fontWeight: 'bold',
    },
  ],
});

export function getTheme(isDarkMode: boolean) {
  return isDarkMode ? darkTheme : lightTheme;
}
