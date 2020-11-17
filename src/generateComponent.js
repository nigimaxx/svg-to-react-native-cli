'use strict';

/**
 * Creates a full component string based upon provided svg data and a component name
 * @param  string svgOutput     The svg data, preformatted
 * @param  string componentName The name of the component without extension
 * @return string               The parsed component string
 */
module.exports = (svgOutput, componentName) => `
import React from 'react';
import {
  Svg,
  Circle,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Symbol,
  Text,
  Use,
  Defs,
  Stop
} from 'react-native-svg';

type Props = { fill?: string; stroke?: string; height?: number; width?: number };

export default function ${componentName}(props: Props) {
  return (
${svgOutput
  .split('\n')
  .map(line => `    ${line}`)
  .join('\n')}
  );
}
`;
