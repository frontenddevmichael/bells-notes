// AmbientGrain — paper-grain whisper (port of .book-cover::after 3px radial).
// Non-functional decor, alpha 0.04, pointer-transparent, motion-independent.
// Screens opt in sparingly (Home hero); never over scrolling lists.
// Occupies the FULL screen (absoluteFill escape from its parent's padding)
// so the grain never reads as a shaded box behind centered text.
import { View, StyleSheet } from 'react-native';

export function AmbientGrain() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#23201c',
          opacity: 0.04,
        }}
      />
    </View>
  );
}
