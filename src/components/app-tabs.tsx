import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor="#eaf6ee"
      iconColor={{ default: colors.textSecondary, selected: '#008044' }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: '#008044' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="s-etukortti">
        <NativeTabs.Trigger.Label>S-Etukortti</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'wave.3.right', selected: 'wave.3.right' }}
          md="waves"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bank">
        <NativeTabs.Trigger.Label>Bank</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'wallet.bifold', selected: 'wallet.bifold.fill' }}
          md="account_balance_wallet"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="financial-trainer">
        <NativeTabs.Trigger.Label>Financial Trainer</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="monitoring"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
