import Immutable from 'immutable';
import { CharacterMetadata } from 'draft-js';

// === data structures ===

class Chunk extends Immutable.Record({
  text: '',
  metadata: CharacterMetadata.create(),
}) {
  getText() {
    return this.get('text');
  }

  getMetadata() {
    return this.get('metadata');
  }

  hasStyle(style) {
    return this.getMetadata().hasStyle(style);
  }

  addText(moreText) {
    return this.update('text', (text) => `${text}${moreText}`)
  }
}

// === convert draft js to html ===

/**
 * Given editorState, return html
 */
function editorStateToHtml(editorState) {
  const blocks = editorState
    .getCurrentContent()
    .getBlockMap()
    .toList();

  return render(blocks.map(transformBlock));
}

/**
 * Transforms draft js block into our internal block data structure
 */
function transformBlock(block) {
  const text = block.getText();
  const characterList = block.getCharacterList();
  return groupByStyles(text, characterList);
}

/**
 * input:
 *
 * "1234", [
 *   { style: ['BOLD'] },
 *   { style: ['BOLD'] },
 *   { style: ['BOLD', 'ITALIC'] },
 *   { style: [] }
 * ]
 *
 * output:
 *
 * [
 *   { text: "12", style: ['BOLD'] },
 *   { text: "3", style: ['BOLD', 'ITALIC'] },
 *   { text: "4", style: [] }
 * ]
 */
function groupByStyles(text, characterList) {
  let chunks = Immutable.List();

  characterList.forEach((metadata, i) => {
    const char = text[i];
    if (chunks.isEmpty() || chunks.last().getMetadata() !== metadata) {
      chunks = chunks.push(new Chunk({ text: char, metadata }))
    } else {
      const lastIndex = chunks.count() - 1;
      chunks = chunks.update(lastIndex, (chunk) => chunk.addText(char))
    }
  });

  return chunks;
}

// === rendering logic ===
const html = {
  p(content) {
    return wrap('p', content);
  },

  strong(content) {
    return wrap('strong', content);
  },

  em(content) {
    return wrap('em', content);
  },

  span(content, css = Immutable.Map()) {
    return wrap('span', content, css);
  }
};

function wrap(tag, content, css) {
  if (css) {
    return `<${tag} style="${stylify(css)}">${content}</${tag}>`
  } else {
    return `<${tag}>${content}</${tag}>`
  }
}

function stylify(css) {
  return join(css.map((value, key) => `${key}:${value};`))
}

/**
 * NOTE:
 * 	* valid values for each style is either `tag` OR `css`
 *  * tag's value MUST be implemented by the `html` object
 *  * css's value MUST be a valid css style
 */
const INLINE_STYLES = Immutable.fromJS({
  BOLD: {
    tag: 'strong',
  },
  ITALIC: {
    tag: 'em'
  },
  UNDERLINE: {
    css: {
      'text-decoration': 'underline',
    },
  },
});

if (__DEV__) {
  INLINE_STYLES.forEach((value) => {
    if (value.has('tag') && !html[value.get('tag')]) {
      throw new Error(`Invalid INLINE_STYLES: html must implement ${value.get('tag')}`)
    }
  });
}


const INLINE_STYLES_LIST = Immutable.List(INLINE_STYLES.keySeq());

function render(blocks) {
  // console.log(blocks.toJS())
  return join(blocks.map(renderBlock));
}

function renderBlock(block) {
  return html.p(applyInlineStyles(block));
}

/**
 * input:
 *
 * [
 *   { text: "12", style: ['BOLD'] },
 *   { text: "3", style: ['BOLD', 'ITALIC'] },
 *   { text: "4", style: []  }
 * ]
 *
 * output:
 *
 * <strong>12</strong>
 * <strong><em>3</em></strong>
 * 4
 */
function applyInlineStyles(block) {
  return join(block.map(applyInlineStylesForChunk));
}

function applyInlineStylesForChunk(chunk) {
  return INLINE_STYLES_LIST.reduce((content, style) => {
    if (chunk.hasStyle(style)) {
      return handleStyle(style, content);
    }

    return content;
  }, chunk.getText());
}

function handleStyle(style, content) {
  if (INLINE_STYLES.hasIn([style, 'tag'])) {
    const tag = INLINE_STYLES.getIn([style, 'tag']);
    return html[tag](content);
  } else {
    const css = INLINE_STYLES.getIn([style, 'css']);
    return html.span(content, css);
  }
}

function join(list) {
  return list.join('');
}

export default editorStateToHtml;
