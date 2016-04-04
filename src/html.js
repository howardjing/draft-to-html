// === helper methods for rendering html ===

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

  h1(content) {
    return wrap('h1', content);
  },

  h2(content) {
    return wrap('h2', content);
  },

  h3(content) {
    return wrap('h3', content);
  },

  h4(content) {
    return wrap('h4', content);
  },

  h5(content) {
    return wrap('h5', content);
  },

  h6(content) {
    return wrap('h6', content);
  },

  blockquote(content) {
    return wrap('blockquote', content);
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
  return css.map((value, key) => `${key}:${value};`).join('');
}

export default html;
