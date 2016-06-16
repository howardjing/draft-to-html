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
  UNORDERED_LIST_ITEM: 'unordered-list-item',
  ORDERED_LIST_ITEM: 'ordered-list-item',
};

const INLINE_STYLE_TYPES = {
  BOLD: 'BOLD',
  ITALIC: 'ITALIC',
  UNDERLINE: 'UNDERLINE',
  CODE: 'CODE',
};

const WRAPPER_BLOCK_TYPES = {
  UNORDERED_LIST: 'unordered-list',
  ORDERED_LIST: 'ordered-list',
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
  [BLOCK_TYPES.UNORDERED_LIST_ITEM]: {
    tag: 'li',
    wrapperType: WRAPPER_BLOCK_TYPES.UNORDERED_LIST,
  },
  [BLOCK_TYPES.ORDERED_LIST_ITEM]: {
    tag: 'li',
    wrapperType: WRAPPER_BLOCK_TYPES.ORDERED_LIST,
  },
});

const WRAPPER_BLOCK_TYPES_MAP = Immutable.fromJS({
  [WRAPPER_BLOCK_TYPES.UNORDERED_LIST]: {
    tag: 'ul',
  },
  [WRAPPER_BLOCK_TYPES.ORDERED_LIST]: {
    tag: 'ol',
  },
})

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
  const validateType = (type) => {
    if (type.has('tag') && !html[type.get('tag')]) {
      throw new Error(`Invalid tag type: html must implement ${type.get('tag')}`);
    }
  };

  BLOCK_TYPES_MAP.forEach(validateType);
  WRAPPER_BLOCK_TYPES_MAP.forEach(validateType);
  INLINE_STYLES_MAP.forEach(validateType);
}

// list of active inline style types
const INLINE_STYLES_LIST = Immutable.List(INLINE_STYLES_MAP.keySeq());

// === data structures used to render html ===

class Block extends Immutable.Record({
  type: BLOCK_TYPES.UNSTYLED,
  chunks: Immutable.List(),
}) {
  isWrapper() {
    return false;
  }

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

class WrapperBlock extends Immutable.Record({
  type: WRAPPER_BLOCK_TYPES.UNORDERED_LIST,
  blocks: Immutable.List(),
}) {
  isWrapper() {
    return true;
  }

  getType() {
    return this.get('type');
  }


  /**
   * Returns how deep we are currently nested. For example
   *
   * ```
   * <ul>
   *   <li>
   *     <ul>
   *       <li>a</li>
   *       <li>b</li>
   *     </ul>
   *   </li>
   *   <li>
   *   	c
   *   </li>
   * </ul>
   * ```
   *
   * would return 0, since even though the previous block has a depth of 1,
   * we are currently not in a nested list at all.
   *
   * TODO: this method is recursive, can probably cache instead
   */
  currentDepth(depth = 0) {
    const lastBlock = this.getBlocks().last();
    if (lastBlock && lastBlock.isWrapper()) {
      return lastBlock.maxDepth(depth + 1);
    }

    return depth;
  }

  getBlocks() {
    return this.get('blocks');
  }

  updateLastBlock(fn) {
    const lastBlockIndex = this.getBlocks().count();
    if (lastBlockIndex < 0) {
      throw new Error('blocks is empty');
    }

    // return this.updateIn(['blocks', lastBlockIndex], fn);
  }

  addBlock(block) {
    return this.update('blocks', (blocks) => blocks.push(block));
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

  return render(blocks.reduce(transform, Immutable.List()));
}

// === convert draft-js data structure to html data structure ===

/**
 * Transforms draft js block into our internal block data structure
 */
function transform(document, block) {
  const type = block.getType();
  const text = block.getText();
  const depth = block.getDepth();
  const characterList = block.getCharacterList();
  const processedBlock = addInlineStylesToBlock(new Block({ type }), text, characterList);

  if (needsWrapper(processedBlock)) {
    const last = document.last();
    if (last && last.isWrapper()) {
      const lastIndex = document.count() - 1;
      return document.update(lastIndex, (wrapper) => addBlock(wrapper, processedBlock, depth));
    } else {
      return document.push(wrap(processedBlock))
    }
  }

  return document.push(processedBlock);
}

function addBlock(wrapper, processedBlock, depth) {
  // introduce another layer of depth
if (depth > wrapper.currentDepth()) {
    return wrapper.updateLastBlock(wrap(processedBlock));
  }

  return wrapper.addBlock(processedBlock);
}

function needsWrapper(block) {
  const type = block.getType();
  return type === BLOCK_TYPES.UNORDERED_LIST_ITEM || type === BLOCK_TYPES.ORDERED_LIST_ITEM;
}

function wrap(block) {
  return new WrapperBlock({ type: getWrapperType(block) }).addBlock(block);
}

function getWrapperType(block) {
  const type = BLOCK_TYPES_MAP.getIn([block.getType(), 'wrapperType']);
  if (!type) {
    throw new Error(`${block.getType()} must specify its wrapper tag.`);
  }
  return type;
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
  return join(blocks.map(renderBlock));
}

function renderBlock(block) {
  const blockType = block.getType();

  if (!BLOCK_TYPES_MAP.has(blockType) && !WRAPPER_BLOCK_TYPES_MAP.has(blockType)) {
    throw new Error(`Unhandled block type ${blockType}`);
  }

  if (block.isWrapper()) {
    // TODO: call to unwrap is mutually recursive -- maybe there's a better way?
    return addTagForWrapper(blockType, unwrap(block));
  }

  return addTagForBlockType(blockType, applyInlineStyles(block));
}

function unwrap(wrapper) {
  return join(wrapper.getBlocks().map(renderBlock));
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

function addTagForWrapper(key, content) {
  return addTag(WRAPPER_BLOCK_TYPES_MAP, key, content);
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
