import { StreamLanguage, StreamParser } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

const COMMENT_PREFIX = ';';

const linesSimpleParser: StreamParser<null> = {
  startState() {
    return null;
  },

  token(stream, _state) {
    // If we're currently at the start of a comment, style the rest as comment
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (stream.match(COMMENT_PREFIX)) {
      stream.skipToEnd();
      return 'comment'; // maps to tags.comment
    }

    // Otherwise, consume normal text up to the next comment or end of line
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    while (!stream.eol() && !stream.match(COMMENT_PREFIX, false)) {
      stream.next();
    }
    return null; // plain text (no special style)
  },
};

export const linesSimpleLanguage = StreamLanguage.define(linesSimpleParser);

export const linesCommentSyntax = EditorState.languageData.of(() => [
  {
    commentTokens: {
      line: COMMENT_PREFIX,
    },
  },
]);
