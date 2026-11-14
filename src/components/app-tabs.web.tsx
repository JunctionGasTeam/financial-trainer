import { SymbolView } from 'expo-symbols';
import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const activeColor = '#008044';

const tabDefinitions = [
  { name: 'home', href: '/', label: 'Home', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { name: 's-etukortti', href: '/s-etukortti', label: 'S-Etukortti', icon: { ios: 'wave.3.right', android: 'waves', web: 'waves' } },
  { name: 'bank', href: '/bank', label: 'Bank', icon: { ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' } },
  { name: 'me', href: '/me', label: 'Me', icon: { ios: 'person.crop.circle.fill', android: 'person', web: 'person' } },
  { name: 'financial-trainer', href: '/financial-trainer', label: 'Financial Trainer', icon: { ios: 'chart.bar.fill', android: 'monitoring', web: 'monitoring' } },
] as const;

export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.tabSlot} />
      <TabList asChild>
        <CustomTabList>
          {tabDefinitions.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabIcon = (typeof tabDefinitions)[number]['icon'];

const TabButton = forwardRef<
  ComponentRef<typeof Pressable>,
  Omit<TabTriggerSlotProps, 'ref'> & { icon: TabIcon }
>(function TabButton({ children, isFocused, icon, ...props }, ref) {
  const theme = useTheme();
  const tintColor = isFocused ? activeColor : theme.textSecondary;

  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <SymbolView name={icon} tintColor={tintColor} size={25} />
      <Text numberOfLines={1} style={[styles.tabLabel, { color: tintColor }]}>
        {children}
      </Text>
    </Pressable>
  );
});

function CustomTabList(props: TabListProps) {
  return <View {...props} style={styles.tabBar} />;
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  tabSlot: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
    cursor: 'pointer',
  },
  tabLabel: {
    maxWidth: '100%',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
