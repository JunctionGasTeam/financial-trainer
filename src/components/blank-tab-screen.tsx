import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

export function BlankTabScreen() {
  return <ThemedView style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
