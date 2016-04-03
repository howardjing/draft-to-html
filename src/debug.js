import React from 'react';
import toHtml from './state-to-html';

const Debug = ({ editorState }) => {
  const contentState = editorState.getCurrentContent();
  const html = toHtml(editorState);
  const markup = { __html: html };

  return (
    <div style={styles.container}>
      <pre style={styles.item}>
        {JSON.stringify(contentState, null, 2)}
      </pre>
      <div
        style={styles.item}
        dangerouslySetInnerHTML={markup}
      />
      <div style={styles.item}>{html}</div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
  },
  item: {
    flex: '1',
  }
};

export default Debug;
