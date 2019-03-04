// import css from 'rollup-plugin-css-only';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
export default {
  input: 'src/ridgeplot.js',
  output: {
      file:'./dist/ridgeplot.js', // equivalent to --output
      format: 'umd',
      name:'ridgeplot',

      globals:{
        'd3-selection':'d3',
        'd3-shape':'d3',
        'd3-axis':'d3',
        'd3-scale':'d3',
        'd3-collection':'d3',
        'd3-array':'d3',
        'd3-scale-chromatic':'d3'	
      
      }
  },
  plugins: [
    resolve(),
    commonjs(),
    // css({ output: './dist/ridgeplot.css' }),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  name: 'ridgeplot',
  watch:{
	exclude: 'node_modules/**'
  },
  external:[
    'd3-selection',
    'd3-shape',
    'd3-axis',
    'd3-scale',
    'd3-collection',
    'd3-array',
    'd3-scale-chromatic'

  ]

};