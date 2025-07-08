// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
// };
module.exports = {
  presets: [
    'module:metro-react-native-babel-preset'
  ],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'classic',   
      }
    ]
  ]
};
