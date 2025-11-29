import { StreamLanguage, StreamParser } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { isTruthy } from '../../common/boolean';

const COMMENT_PREFIX = ';';

const linesSimpleParser: StreamParser<null> = {
  startState() {
    return null;
  },

  token(stream, _state) {
    // Handle headers (allow leading spaces)
    if (stream.sol()) {
      stream.eatSpace();
      if (stream.peek() === '[') {
        stream.next(); // consume '['
        // consume until closing ']' or EOL
        while (!stream.eol() && stream.peek() !== ']') {
          stream.next();
        }
        if (stream.peek() === ']') stream.next(); // consume ']'
        return 'namespace';
      }

      // Leading-space comments like "  ; comment"
      if (isTruthy(stream.match(COMMENT_PREFIX))) {
        stream.skipToEnd();
        return 'comment';
      }
    }

    // Inline comment starting at current position
    if (isTruthy(stream.match(COMMENT_PREFIX))) {
      stream.skipToEnd();
      return 'comment'; // maps to tags.comment
    }

    // Otherwise, consume normal text up to the next comment or end of line
    while (!stream.eol() && !isTruthy(stream.match(COMMENT_PREFIX, false))) {
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
