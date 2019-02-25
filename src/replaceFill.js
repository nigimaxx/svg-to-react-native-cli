module.exports = function replaceAll(str) {
  return str.replace(/fill=".*?"/gm, 'fill={props.fill}');
};
