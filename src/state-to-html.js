import Immutable from 'immutable';
import { CharacterMetadata } from 'draft-js';
import html from './html';

// === mappings from draft-js to html ===

const BLOCK_TYPES = {
  UNSTYLED: 'unstyled',
  HEADER_ONE: 'header-one',
  HEADER_TWO: 'header-two',
  HEADER_THREE: 'header-three',
  HEADER_FOUR: 'header-four',
  HEADER_FIVE: 'header-five',
  HEADER_SIX: 'header-six',
  BLOCKQUOTE: 'blockquote',
};

const INLINE_STYLE_TYPES = {
  BOLD: 'BOLD',
  ITALIC: 'ITALIC',
  UNDERLINE: 'UNDERLINE',
  CODE: 'CODE',
};

const BLOCK_TYPES_MAP = Immutable.fromJS({
  [BLOCK_TYPES.UNSTYLED]: {
    tag: 'p',
  },
  [BLOCK_TYPES.HEADER_ONE]: {
    tag: 'h1',
  },
  [BLOCK_TYPES.HEADER_TWO]: {
    tag: 'h2',
  },
  [BLOCK_TYPES.HEADER_THREE]: {
    tag: 'h3',
  },
  [BLOCK_TYPES.HEADER_FOUR]: {
    tag: 'h4',
  },
  [BLOCK_TYPES.HEADER_FIVE]: {
    tag: 'h5',
  },
  [BLOCK_TYPES.HEADER_SIX]: {
    tag: 'h6',
  },
  [BLOCK_TYPES.BLOCKQUOTE]: {
    tag: 'blockquote'
  },
});

/**
 * NOTE:
 * 	* valid values for each style is either `tag` OR `css`
 *  * tag's value MUST be implemented by the `html` object
 *  * css's value MUST be a valid css style
 */
const INLINE_STYLES_MAP = Immutable.fromJS({
  [INLINE_STYLE_TYPES.BOLD]: {
    tag: 'strong',
  },
  [INLINE_STYLE_TYPES.ITALIC]: {
    tag: 'em'
  },
  [INLINE_STYLE_TYPES.UNDERLINE]: {
    css: {
      'text-decoration': 'underline',
    },
  },
  [INLINE_STYLE_TYPES.CODE]: {
    css: {
      'font-family': 'Inconsolata, Menlo, Consolas, monospace',
    },
  },
});

if (__DEV__) {
  const validateStyle = (style) => {
    if (style.has('tag') && !html[style.get('tag')]) {
      throw new Error(`Invalid style: html must implement ${style.get('tag')}`);
    }
  };

  BLOCK_TYPES_MAP.forEach(validateStyle);
  INLINE_STYLES_MAP.forEach(validateStyle);
}

// list of active inline style types
const INLINE_STYLES_LIST = Immutable.List(INLINE_STYLES_MAP.keySeq());

// === data structures used to render html ===

class Block extends Immutable.Record({
  type: BLOCK_TYPES.UNSTYLED,
  chunks: Immutable.List(),
}) {
  getLastChunk() {
    return this.get('chunks').last();
  }

  getType() {
    return this.get('type');
  }

  getChunks() {
    return this.get('chunks');
  }

  addChunk(chunk) {
    return this.update('chunks', (chunks) => chunks.push(chunk));
  }

  addTextToLastChunk(char) {
    const lastChunkIndex = this.get('chunks').count() - 1;
    return this.updateIn(['chunks', lastChunkIndex], (chunk) => chunk.addText(char));
  }
}

// a chunk of inline styling
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

// === convert editor state to html ===

/**
 * Given editorState, return html.
 *
 * First transform editorState's current content into a data structure
 * suitable for converting into html.
 *
 * Then convert that html data structure into an html string.
 */
function editorStateToHtml(editorState) {
  const blocks = editorState
    .getCurrentContent()
    .getBlockMap()
    .toList();

  return render(blocks.map(transformBlock));
}

// === convert draft-js data structure to html data structure ===

/**
 * Transforms draft js block into our internal block data structure
 */
function transformBlock(block) {
  const type = block.getType();
  const text = block.getText();
  const characterList = block.getCharacterList();
  return addInlineStylesToBlock(new Block({ type }), text, characterList);
}

/**
 * Breaks a block's text down into chunks grouped by the same styling.
 *
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
function addInlineStylesToBlock(emptyBlock, text, characterList) {
  if (!text) {
    return emptyBlock;
  }

  const [head, ...rest] = characterList;
  const initial = emptyBlock.addChunk(
    new Chunk({
      text: text[0],
      metadata: head,
    })
  );

  return rest.reduce((block, metadata, i) => {
    const char = text[i+1]; // i + 1 because we already processed the first chunk

    if (block.getLastChunk().getMetadata() === metadata) {
      return block.addTextToLastChunk(char);
    }

    return block.addChunk(new Chunk({ text: char, metadata }));
  }, initial);
}

// === convert html data structure to html string ===

function render(blocks) {
  // console.log(blocks.toJS())
  return join(blocks.map(renderBlock));
}

function renderBlock(block) {
  const blockType = block.getType();

  if (!BLOCK_TYPES_MAP.has(blockType)) {
    throw new Error(`Unhandled block type ${blockType}`);
  }

  return addTagForBlockType(blockType, applyInlineStyles(block));
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
  return join(block.getChunks().map(applyInlineStylesForChunk));
}

function applyInlineStylesForChunk(chunk) {
  return INLINE_STYLES_LIST.reduce((content, style) => {
    if (chunk.hasStyle(style)) {
      return addTagForInlineStyle(style, content);
    }

    return content;
  }, chunk.getText());
}

function addTagForBlockType(key, content) {
  return addTag(BLOCK_TYPES_MAP, key, content);
}

function addTagForInlineStyle(key, content) {
  return addTag(INLINE_STYLES_MAP, key, content);
}

function addTag(mapper, key, content) {
  if (mapper.hasIn([key, 'tag'])) {
    const tag = mapper.getIn([key, 'tag']);
    return html[tag](content);
  } else {
    const css = mapper.getIn([key, 'css']);
    return html.span(content, css);
  }
}

function join(list) {
  return list.join('');
}

export default editorStateToHtml;
