// import css from 'rollup-plugin-css-only';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
export default {
  input: 'src/horizonchart.js',
  output: {
      file:'./dist/horizonchart.js', // equivalent to --output
      format: 'umd'
  },
  plugins: [
    resolve(),
    commonjs(),
    // css({ output: './dist/horizonchart.css' }),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  name: 'horizonchart',
  watch:{
	exclude: 'node_modules/**'
  },
  external:[
    'd3-selection',
    'd3-shape',
    'd3-axis',
	'd3-scale',
	'd3-collection'

  ],
  globals:{
    'd3-selection':'d3',
    'd3-shape':'d3',
    'd3-axis':'d3',
	'd3-scale':'d3',
	'd3-collection':'d3'	
  }

};