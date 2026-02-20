import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { getSchoolLogoUrl } from '@/lib/schoolLogos'
import { colors, fontFamily} from '@/constants/theme'

interface SchoolLogoProps {
  schoolName: string
  size?: number
}

export function SchoolLogo({ schoolName, size = 28 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false)
  const url = getSchoolLogoUrl(schoolName)

  if (!url || failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
          {schoolName.charAt(0).toUpperCase()}
        </Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={200}
      onError={() => setFailed(true)}
    />
  )
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
  },
})
