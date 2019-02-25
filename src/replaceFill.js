module.exports = function replaceAll(str) {
  return str.replace(/fill=(".*?")/gm, function (a, color) {
    return 'fill={props.fill || ' + color + '}';
  });
};
