import React, { Component } from 'react';
import classNames from 'classnames';
import { Editor, EditorState, RichUtils } from 'draft-js';

class RichEditor extends Component {
  state = {
    editorState: EditorState.createEmpty()
  };

  focus = () => this.refs.editor.focus();

  onChange = (editorState) => this.setState({ editorState });

  handleKeyCommand = (command) => {
    const { editorState } = this.state;
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }

    return false;
  };

  toggleBlockType = (blockType) => {
    const { editorState } = this.state;
    this.onChange(
      RichUtils.toggleBlockType(
        editorState,
        blockType
      )
    );
  };

  toggleInlineStyle = (inlineStyle) => {
    const { editorState } = this.state;
    this.onChange(
      RichUtils.toggleInlineStyle(
        editorState,
        inlineStyle
      )
    );
  };

  render() {
    const { editorState } = this.state;

    // if user changes block type before entering text, hide it for now
    const contentState = editorState.getCurrentContent();
    const shouldHide = (
      !contentState.hasText() &&
      contentState.getBlockMap().first().getType() !== 'unstyled'
    );

    const className = classNames({
        'RichEditor-editor': true,
        'RichEditor-hidePlaceholder': shouldHide,
    });

    return (
      <div className="RichEditor-root">
        <BlockStyleControls
          editorState={editorState}
          onToggle={this.toggleBlockType}
        />
        <InlineStyleControls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
        />
        <div
          className={className}
          onClick={this.focus}
        >
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            onChange={this.onChange}
            placeholder='Tell a story...'
            ref='editor'
            spellCheck={true}
          />
        </div>
      </div>
    );
  }
}

// custom override for 'code' style
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}

class StyleButton extends Component {
  onToggle = (e) => {
    const { onToggle, style } = this.props;
    e.preventDefault();
    onToggle(style);
  };

  render() {
    const { active, label } = this.props;
    const className = classNames({
      'RichEditor-styleButton': true,
      'RichEditor-activeButton': active,
    });

    return (
      <span
        className={className}
        onMouseDown={this.onToggle}
      >
        {label}
      </span>
    );
  }
}

const BLOCK_TYPES = [
  { label: 'H1', style: 'header-one' },
  { label: 'H2', style: 'header-two' },
  { label: 'H3', style: 'header-three' },
  { label: 'H4', style: 'header-four' },
  { label: 'H5', style: 'header-five' },
  { label: 'H6', style: 'header-six' },
  { label: 'Blockquote', style: 'blockquote' },
  { label: 'UL', style: 'unordered-list-item' },
  { label: 'OL', style: 'ordered-list-item' },
  { label: 'Code Block', style: 'code-block' },
];

class BlockStyleControls extends Component {
  renderButton = (type) => {
    const { editorState, onToggle } = this.props;
    const selection = editorState.getSelection();
    const blockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

    return (
      <StyleButton
        key={type.label}
        active={type.style === blockType}
        label={type.label}
        onToggle={onToggle}
        style={type.style}
      />
    );
  };

  render() {
    return (
      <div className="RichEditor-controls">
        {BLOCK_TYPES.map(this.renderButton)}
      </div>
    )
  }
}

const INLINE_STYLES = [
  { label: 'Bold', style: 'BOLD' },
  { label: 'Italic', style: 'ITALIC' },
  { label: 'Underline', style: 'UNDERLINE' },
  { label: 'Monospace', style: 'CODE' },
];

class InlineStyleControls extends Component {
  renderButton = (type) => {
    const { editorState, onToggle } = this.props;
    const currentStyle = editorState.getCurrentInlineStyle();
    return (
      <StyleButton
        key={type.label}
        active={currentStyle.has(type.style)}
        label={type.label}
        onToggle={onToggle}
        style={type.style}
      />
    );
  };

  render() {
    return (
      <div className="RichEditor-controls">
        {INLINE_STYLES.map(this.renderButton)}
      </div>
    );
  }
}

export default RichEditor;
