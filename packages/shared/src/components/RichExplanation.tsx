/**
 * RichExplanation — renders explanation text with auto-linked URLs.
 * Supports structured ExplanationBlock[] when available, with fallback
 * to plain text + auto-link detection for legacy explanations.
 */
import React, { useCallback, useMemo } from 'react';
import {
  Text,
  Linking,
  Alert,
  StyleSheet,
  Image,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { API_CONFIG } from '../config';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ExplanationBlock {
  type: 'paragraph' | 'link' | 'image' | 'bullet_list' | 'code' | 'separator';
  content: string;
  meta?: {
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
    listItems?: string[];
    label?: string; // for links: display text
  };
}

export interface RichExplanationProps {
  /** Plain text explanation (always present) */
  explanation: string;
  /** Optional structured blocks — takes precedence over plain text */
  explanationBlocks?: ExplanationBlock[] | null;
  /** Override text styles */
  textStyle?: object;
  /** Override link styles */
  linkStyle?: object;
  /** Called when an image is tapped (for full-screen viewer) */
  onImagePress?: (uri: string, alt?: string) => void;
}

// ─── Colors (match existing AWS palette) ────────────────────────────────────────

const colors = {
  textBody: '#D1D5DB',
  textMuted: '#9CA3AF',
  primaryOrange: '#FF9900',
  surface: '#1F2937',
  borderDefault: '#374151',
  codeBg: '#111827',
  separator: '#374151',
};

// ─── URL regex — safe, avoids false positives ────────────────────────────────────

// eslint-disable-next-line no-useless-escape
const URL_REGEX = /https?:\/\/(?:[-\w.])+(?::\d+)?(?:\/[-\w.,@?^=%&:\/~+#]*)?/gi;

/**
 * Validate that a URL is safe to open (http/https only)
 */
function isSafeUrl(url: string): boolean {
  try {
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Resolve an image URL — relative paths (e.g. /uploads/...) get the API base prepended.
 */
function resolveImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Relative path — prepend API base URL
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export const RichExplanation: React.FC<RichExplanationProps> = ({
  explanation,
  explanationBlocks,
  textStyle,
  linkStyle,
  onImagePress,
}) => {
  const handleLinkPress = useCallback(async (url: string) => {
    if (!isSafeUrl(url)) {
      Alert.alert('Invalid link', 'This link cannot be opened.');
      return;
    }
    try {
      // On both platforms, Linking.openURL uses:
      // - iOS: SFSafariViewController (via system handling)
      // - Android: Custom Tabs (via system handling)
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'No application available to open this URL.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open the link.');
    }
  }, []);

  // ─── Render structured blocks ───────────────────────────────────────────

  if (explanationBlocks && explanationBlocks.length > 0) {
    return (
      <View style={styles.blocksContainer}>
        {explanationBlocks.map((block, index) => (
          <ExplanationBlockRenderer
            key={index}
            block={block}
            textStyle={textStyle}
            linkStyle={linkStyle}
            onLinkPress={handleLinkPress}
            onImagePress={onImagePress}
          />
        ))}
      </View>
    );
  }

  // ─── Fallback: plain text with auto-link detection ─────────────────────

  return (
    <AutoLinkedText
      text={explanation}
      textStyle={textStyle}
      linkStyle={linkStyle}
      onLinkPress={handleLinkPress}
    />
  );
};

// ─── Auto-linked plain text ─────────────────────────────────────────────────────

interface AutoLinkedTextProps {
  text: string;
  textStyle?: object;
  linkStyle?: object;
  onLinkPress: (url: string) => void;
}

const AutoLinkedText: React.FC<AutoLinkedTextProps> = ({
  text,
  textStyle,
  linkStyle,
  onLinkPress,
}) => {
  const parts = useMemo(() => {
    const result: Array<{ type: 'text' | 'link'; value: string }> = [];
    let lastIndex = 0;

    // Reset regex state
    URL_REGEX.lastIndex = 0;
    let match = URL_REGEX.exec(text);
    while (match !== null) {
      // Add preceding text
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      result.push({ type: 'link', value: match[0] });
      lastIndex = match.index + match[0].length;
      match = URL_REGEX.exec(text);
    }
    // Add remaining text
    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return result;
  }, [text]);

  return (
    <Text style={[styles.textBody, textStyle]}>
      {parts.map((part, index) =>
        part.type === 'link' ? (
          <Text
            key={index}
            style={[styles.link, linkStyle]}
            onPress={() => onLinkPress(part.value)}
            accessibilityRole="link"
          >
            {part.value}
          </Text>
        ) : (
          <Text key={index}>{part.value}</Text>
        ),
      )}
    </Text>
  );
};

// ─── Block Renderer ─────────────────────────────────────────────────────────────

interface ExplanationBlockRendererProps {
  block: ExplanationBlock;
  textStyle?: object;
  linkStyle?: object;
  onLinkPress: (url: string) => void;
  onImagePress?: (uri: string, alt?: string) => void;
}

const ExplanationBlockRenderer: React.FC<ExplanationBlockRendererProps> = ({
  block,
  textStyle,
  linkStyle,
  onLinkPress,
  onImagePress,
}) => {
  switch (block.type) {
    case 'paragraph':
      return (
        <AutoLinkedText
          text={block.content}
          textStyle={textStyle}
          linkStyle={linkStyle}
          onLinkPress={onLinkPress}
        />
      );

    case 'link':
      return (
        <Text
          style={[styles.textBody, styles.link, linkStyle, textStyle]}
          onPress={() => onLinkPress(block.content)}
          accessibilityRole="link"
        >
          {block.meta?.label || block.content}
        </Text>
      );

    case 'image': {
      if (!block.content) return null;
      const uri = resolveImageUrl(block.content);
      return (
        <View style={styles.imageContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onImagePress?.(uri, block.meta?.alt)}
            disabled={!onImagePress}
          >
            <Image
              source={{ uri }}
              style={[
                styles.image,
                block.meta?.width && block.meta?.height
                  ? { aspectRatio: block.meta.width / block.meta.height }
                  : { aspectRatio: 16 / 9 },
              ]}
              resizeMode="contain"
              accessibilityLabel={block.meta?.alt || 'Explanation image'}
            />
          </TouchableOpacity>
          {block.meta?.caption && <Text style={styles.imageCaption}>{block.meta.caption}</Text>}
        </View>
      );
    }

    case 'bullet_list': {
      const items = block.meta?.listItems || [block.content];
      return (
        <View style={styles.bulletList}>
          {items.map((item, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <AutoLinkedText
                text={item}
                textStyle={[styles.textBody, textStyle]}
                linkStyle={linkStyle}
                onLinkPress={onLinkPress}
              />
            </View>
          ))}
        </View>
      );
    }

    case 'code':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{block.content}</Text>
        </View>
      );

    case 'separator':
      return <View style={styles.separator} />;

    default:
      // Unknown block type — render as paragraph for forward compatibility
      return (
        <AutoLinkedText
          text={block.content || ''}
          textStyle={textStyle}
          linkStyle={linkStyle}
          onLinkPress={onLinkPress}
        />
      );
  }
};

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blocksContainer: {
    gap: 12,
  },
  textBody: {
    fontSize: 15,
    color: colors.textBody,
    lineHeight: 24,
  },
  link: {
    color: colors.primaryOrange,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  imageContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.codeBg,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontStyle: 'italic',
  },
  bulletList: {
    paddingLeft: 4,
    gap: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 15,
    color: colors.primaryOrange,
    lineHeight: 24,
    width: 12,
  },
  codeBlock: {
    backgroundColor: colors.codeBg,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: colors.textBody,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 8,
  },
});

export default RichExplanation;
