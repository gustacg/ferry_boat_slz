import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { ComponentProps } from 'react';

const PROJECT_COLOR = '#0066CC';

type PaperButtonProps = ComponentProps<typeof PaperButton>;

interface CustomButtonProps extends Omit<PaperButtonProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({ variant = 'primary', style, ...props }) => {
  const theme = useTheme();

  const getButtonMode = (): 'contained' | 'outlined' | 'text' => {
    switch (variant) {
      case 'primary':
        return 'contained';
      case 'secondary':
        return 'contained';
      case 'outline':
        return 'outlined';
      default:
        return 'contained';
    }
  };
  
  const customStyle = () => {
      switch (variant) {
        case 'primary':
            return { backgroundColor: PROJECT_COLOR };
        case 'secondary':
            return { backgroundColor: theme.colors.surfaceVariant };
        case 'outline':
            return { borderColor: PROJECT_COLOR };
        default:
            return {};
      }
  };
  
  const textColor = variant === 'secondary' ? theme.colors.onSurfaceVariant : (variant === 'outline' ? PROJECT_COLOR : undefined);

  return (
    <PaperButton
      mode={getButtonMode()}
      style={[styles.button, customStyle(), style]}
      labelStyle={styles.label}
      textColor={textColor}
      {...props}
    >
      {props.children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 4,
    marginVertical: 5,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CustomButton;
