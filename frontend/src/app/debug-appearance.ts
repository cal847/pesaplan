import NativeAppearance from 'react-native/Libraries/Utilities/NativeAppearance';

const native: any = NativeAppearance;
const orig = native.setColorScheme.bind(native);
native.setColorScheme = (style: any) => {
  console.log('NATIVE setColorScheme:', JSON.stringify(style), new Error().stack);
  return orig(style);
};