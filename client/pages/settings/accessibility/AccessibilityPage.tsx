import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import { DemoReview } from "@/pages/settings/accessibility/accessibility-components/DemoReview";
import { ContrastDetails } from "@/pages/settings/accessibility/accessibility-components/ContrastDetails";
import { MotionDetails } from "@/pages/settings/accessibility/accessibility-components/MotionDetails";
import { NavigationDetails } from "@/pages/settings/accessibility/accessibility-components/NavigationDetails";
import { ThemeDetails } from "@/pages/settings/accessibility/accessibility-components/ThemeDetails";
import { TextSizeDetails } from "@/pages/settings/accessibility/accessibility-components/TextSizeDetails";

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
  PRIMARY_COLUMN_BEHAVIOR_OPTIONS,
} from "@/pages/settings/provider/settingOptions";

import type {
  Theme,
  TextScale,
  MotionPreference,
  ContrastLevel,
  NavigationBehavior,
  ReviewBehavior,
  PrimaryColumnBehavior,
} from "@/pages/settings/provider/settingsTypes";

import { PrimaryColumnDetails } from "./accessibility-components/PrimaryColumnDetails";

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
    primaryColumnBehavior,
    setPrimaryColumnBehavior,
  } = useSettings();

  const textScaleOptions = TEXT_SCALE_OPTIONS;
  const themeOptions = THEME_OPTIONS;
  const motionOptions = MOTION_OPTIONS;
  const contrastOptions = CONTRAST_OPTIONS;
  const navigationOptions = NAVIGATION_BEHAVIOR_OPTIONS;
  const reviewOptions = REVIEW_BEHAVIOR_OPTIONS;
  const primaryColumnOptions = PRIMARY_COLUMN_BEHAVIOR_OPTIONS;

  return (
    <main className="flex flex-col w-full md:flex-row overflow-y-auto">
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
          <TextSizeDetails />
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
          <ThemeDetails />
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
          <NavigationDetails />
        </SettingCard>

        <SettingCard>
          <SettingHeader
            title="Primary Column Behavior"
            description="Set your layout preference for the primary columns."
          />
          <ButtonRow>
            {Object.entries(primaryColumnOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.label}
                onClick={() => setPrimaryColumnBehavior(key as PrimaryColumnBehavior)}
                isSelected={primaryColumnBehavior === key}
                title={option.title}
              />
            ))}
          </ButtonRow>
          <PrimaryColumnDetails />
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
          <MotionDetails />
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
          <ContrastDetails />
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
