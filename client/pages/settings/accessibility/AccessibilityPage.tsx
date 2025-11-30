import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import {
  CardSection,
  SettingCard,
  ButtonRow,
  SettingButton,
  SettingHeader,
} from "@/pages/settings/accessibility/accessibility-components/Cards";

import {
  TEXT_SCALE_OPTIONS,
  THEME_OPTIONS,
  MOTION_OPTIONS,
  CONTRAST_OPTIONS,
} from "@/pages/settings/provider/settingOptions";

import type {
  Theme,
  TextScale,
  MotionPreference,
  ContrastLevel,
} from "@/pages/settings/provider/settingsTypes";

export function AccessibilityPage() {
  const {
    theme,
    setTheme,
    textScale,
    setTextScale,
    motion,
    setMotion,
    contrast,
    setContrast,
  } = useSettings();

  const textScaleOptions = TEXT_SCALE_OPTIONS;
  const themeOptions = THEME_OPTIONS;
  const motionOptions = MOTION_OPTIONS;
  const contrastOptions = CONTRAST_OPTIONS;

  return (
    <main className="flex flex-col w-full h-full md:flex-row p-2 md:p-5">
      <CardSection>
        <SettingCard>
          <SettingHeader
            title="Text Size"
            description="Adjust the text size used throughout the application."
          />
          <ButtonRow>
            {Object.entries(textScaleOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                style={{ fontSize: option.value }}
                onClick={() => setTextScale(key as TextScale)}
                isSelected={textScale === key}
              />
            ))}
          </ButtonRow>
        </SettingCard>

        <SettingCard>
          <SettingHeader
            title="Theme"
            description="Light or dark theme for the application."
          />
          <ButtonRow>
            {Object.entries(themeOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                onClick={() => setTheme(key as Theme)}
                isSelected={theme === key}
              />
            ))}
          </ButtonRow>
        </SettingCard>
      </CardSection>

      <CardSection>
        <SettingCard>
          <SettingHeader
            title="Motion Speed"
            description="Adjust the speed of animations and motion effects."
          />
          <ButtonRow>
            {Object.entries(motionOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                style={{ fontSize: option.value }}
                onClick={() => setMotion(key as MotionPreference)}
                isSelected={motion === key}
              />
            ))}
          </ButtonRow>
        </SettingCard>

        <SettingCard>
          <SettingHeader
            title="Contrast Level"
            description="Adjust the contrast level for better visibility."
          />
          <ButtonRow>
            {Object.entries(contrastOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                onClick={() => setContrast(key as ContrastLevel)}
                isSelected={contrast === key}
              />
            ))}
          </ButtonRow>
        </SettingCard>
      </CardSection>
    </main>
  );
}
