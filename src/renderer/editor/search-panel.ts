import elt from 'crelt';
// customSearchPanel.ts
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  search,
  SearchQuery,
  selectMatches,
  setSearchQuery,
} from '@codemirror/search';
import { EditorView, type Panel, type ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { replaceAllInSelection } from './replace-in-selection';

function phrase(view: EditorView, text: string) {
  return view.state.phrase(text);
}

/** Custom search panel: essentially the default one plus one extra button. */
class CustomSearchPanel implements Panel {
  searchField: HTMLInputElement;

  replaceField: HTMLInputElement;

  caseField: HTMLInputElement;

  reField: HTMLInputElement;

  wordField: HTMLInputElement;

  dom: HTMLElement;

  query: SearchQuery;

  constructor(readonly view: EditorView) {
    this.query = getSearchQuery(view.state);
    const { query } = this;

    this.commit = this.commit.bind(this);

    this.searchField = elt('input', {
      value: query.search,
      placeholder: phrase(view, 'Find'),
      'aria-label': phrase(view, 'Find'),
      class: 'cm-textfield',
      name: 'search',
      form: '',
      'main-field': 'true',
      onchange: this.commit,
      onkeyup: this.commit,
    }) as HTMLInputElement;

    this.replaceField = elt('input', {
      value: query.replace ?? '',
      placeholder: phrase(view, 'Replace'),
      'aria-label': phrase(view, 'Replace'),
      class: 'cm-textfield',
      name: 'replace',
      form: '',
      onchange: this.commit,
      onkeyup: this.commit,
    }) as HTMLInputElement;

    this.caseField = elt('input', {
      type: 'checkbox',
      name: 'case',
      form: '',
      checked: query.caseSensitive,
      onchange: this.commit,
    }) as HTMLInputElement;

    this.reField = elt('input', {
      type: 'checkbox',
      name: 're',
      form: '',
      checked: query.regexp,
      onchange: this.commit,
    }) as HTMLInputElement;

    this.wordField = elt('input', {
      type: 'checkbox',
      name: 'word',
      form: '',
      checked: query.wholeWord,
      onchange: this.commit,
    }) as HTMLInputElement;

    const button = (name: string, onclick: () => void, label: string) =>
      elt('button', { class: 'cm-button', name, onclick, type: 'button' }, [
        label,
      ]);

    // ✨ New button
    const replaceInSelection = button(
      'replace-in-selection',
      () => this.onExtraButton(),
      'replace all in selection'
    );

    this.dom = elt(
      'div',
      {
        onkeydown: (e: KeyboardEvent) => this.keydown(e),
        class: 'cm-panel cm-search',
      },
      [
        this.searchField,
        button('next', () => findNext(view), phrase(view, 'next')),
        button('prev', () => findPrevious(view), phrase(view, 'previous')),
        button('select', () => selectMatches(view), phrase(view, 'all')),
        elt('label', null, [this.caseField, phrase(view, 'match case')]),
        elt('label', null, [this.reField, phrase(view, 'regexp')]),
        elt('label', null, [this.wordField, phrase(view, 'by word')]),
        ...(view.state.readOnly
          ? []
          : [
              elt('br', null),
              this.replaceField,
              button(
                'replace',
                () => replaceNext(view),
                phrase(view, 'replace')
              ),
              button(
                'replaceAll',
                () => replaceAll(view),
                phrase(view, 'replace all')
              ),

              replaceInSelection,
            ]),
        elt(
          'button',
          {
            name: 'close',
            onclick: () => closeSearchPanel(view),
            'aria-label': phrase(view, 'close'),
            type: 'button',
          },
          ['×']
        ),
      ]
    );
  }

  /** What the extra button does – replace this with your own logic. */
  onExtraButton() {
    replaceAllInSelection(this.view);
  }

  commit() {
    const query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.caseField.checked,
      regexp: this.reField.checked,
      wholeWord: this.wordField.checked,
      replace: this.replaceField.value,
    });
    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
    }
  }

  keydown(e: KeyboardEvent) {
    // Enter in search field → next / previous
    if (e.key === 'Enter' && e.target === this.searchField) {
      e.preventDefault();
      (e.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e.key === 'Enter' && e.target === this.replaceField) {
      e.preventDefault();
      replaceNext(this.view);
    }
  }

  update(update: ViewUpdate) {
    // Keep local query in sync with state
    const newQuery = getSearchQuery(update.state);
    if (!newQuery.eq(this.query)) this.setQuery(newQuery);
  }

  setQuery(query: SearchQuery) {
    this.query = query;
    this.searchField.value = query.search;
    this.replaceField.value = query.replace ?? '';
    this.caseField.checked = query.caseSensitive;
    this.reField.checked = query.regexp;
    this.wordField.checked = query.wholeWord;
  }

  mount() {
    this.searchField.select();
  }
}

/** Extension: search with the custom panel instead of the default one. */
export function customSearchPanelExtension(): Extension {
  return search({
    createPanel: (view) => new CustomSearchPanel(view),
  });
}
