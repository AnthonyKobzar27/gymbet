import React from 'react';
import { Image } from 'react-native';
import makeBlockie from 'ethereum-blockies-base64';

export function UserAvatar({ hash, size = 50 }: { hash: string; size?: number }) {
  const dataUri = makeBlockie(hash.toLowerCase());
  return (
    <Image
      source={{ uri: dataUri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}
