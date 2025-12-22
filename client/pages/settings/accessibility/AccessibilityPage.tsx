import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import { DemoReview } from "@/pages/settings/accessibility/accessibility-components/DemoReview";

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
  NAVIGATION_BEHAVIOR_OPTIONS,
  REVIEW_BEHAVIOR_OPTIONS,
} from "@/pages/settings/provider/settingOptions";

import type {
  Theme,
  TextScale,
  MotionPreference,
  ContrastLevel,
  NavigationBehavior,
  ReviewBehavior,
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
    navigationBehavior,
    setNavigationBehavior,
    reviewBehavior,
    setReviewBehavior,
  } = useSettings();

  const textScaleOptions = TEXT_SCALE_OPTIONS;
  const themeOptions = THEME_OPTIONS;
  const motionOptions = MOTION_OPTIONS;
  const contrastOptions = CONTRAST_OPTIONS;
  const navigationOptions = NAVIGATION_BEHAVIOR_OPTIONS;
  const reviewOptions = REVIEW_BEHAVIOR_OPTIONS;

  return (
    <main className="flex flex-col w-full h-full md:flex-row p-4 gap-4 overflow-y-auto">
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
                title={option.title}
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
                title={option.title}
              />
            ))}
          </ButtonRow>
        </SettingCard>
        <SettingCard>
          <SettingHeader
            title="Navigation Bar Behavior"
            description="Customize how the navigation bar behaves."
          />
          <ButtonRow>
            {Object.entries(navigationOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                onClick={() => setNavigationBehavior(key as NavigationBehavior)}
                isSelected={navigationBehavior === key}
                title={option.title}
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
                title={option.title}
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
                title={option.title}
              />
            ))}
          </ButtonRow>
        </SettingCard>
        <SettingCard>
          <SettingHeader
            title="Review Behavior"
            description="When our AI is uncertain, job cards are flagged for your review."
          />
          <ButtonRow>
            {Object.entries(reviewOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                onClick={() => setReviewBehavior(key as ReviewBehavior)}
                isSelected={reviewBehavior === key}
                title={option.title}
              />
            ))}
          </ButtonRow>
          <DemoReview />
        </SettingCard>
      </CardSection>
    </main>
  );
}
