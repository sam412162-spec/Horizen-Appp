import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { brand } from '@/theme';

const pattern = require('../../assets/images/pattern.jpg');

/**
 * Brand canvas behind every light screen: terracotta with the sand
 * "More than movement" swirls in the top-right and bottom-left corners.
 */
export function AmbientBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: brand.terracotta }]} pointerEvents="none">
      <Image source={pattern} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
    </View>
  );
}
