import { useSettings } from "@/pages/settings/provider/settingsContext";
import { DemoReview } from "@/pages/settings/display/display-components/DemoReview";
import { ContrastDetails } from "@/pages/settings/display/display-components/ContrastDetails";
import { MotionDetails } from "@/pages/settings/display/display-components/MotionDetails";
import { NavigationDetails } from "@/pages/settings/display/display-components/NavigationDetails";
import { ThemeDetails } from "@/pages/settings/display/display-components/ThemeDetails";
import { TextSizeDetails } from "@/pages/settings/display/display-components/TextSizeDetails";
import {
  SettingCard,
  ButtonRow,
  SettingButton,
  SettingHeader,
} from "@/pages/settings/display/display-components/Cards";

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

import { PrimaryColumnDetails } from "./display-components/PrimaryColumnDetails";

export function DisplaySettings() {
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
    <div className="settings-preference-grid">
      <section className="settings-group">
        <SettingCard>
          <SettingHeader
            title="Appearance"
            description="Theme, text scale, contrast, and animation preferences."
          />
          <div className="settings-control-list settings-appearance-grid">
            <div className="settings-control-row settings-control-text-size">
              <div className="settings-control-copy">
                <h3>Text Size</h3>
                <TextSizeDetails />
              </div>
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
            </div>

            <div className="settings-control-row settings-control-theme">
              <div className="settings-control-copy">
                <h3>Theme</h3>
                <ThemeDetails />
              </div>
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
            </div>

            <div className="settings-control-row settings-control-motion">
              <div className="settings-control-copy">
                <h3>Motion Speed</h3>
                <MotionDetails />
              </div>
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
            </div>

            <div className="settings-control-row settings-control-contrast">
              <div className="settings-control-copy">
                <h3>Contrast</h3>
                <ContrastDetails />
              </div>
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
            </div>
          </div>
        </SettingCard>
      </section>

      <section className="settings-group">
        <SettingCard>
          <SettingHeader
            title="Workspace Layout"
            description="Navigation and board behavior for your application pipeline."
          />
          <div className="settings-control-list settings-workspace-grid">
            <div className="settings-control-row settings-control-row-preview settings-control-primary">
              <div className="settings-control-copy">
                <h3>Primary Columns</h3>
                <PrimaryColumnDetails />
              </div>
              <ButtonRow>
                {Object.entries(primaryColumnOptions).map(([key, option]) => (
                  <SettingButton
                    key={key}
                    label={option.label}
                    onClick={() =>
                      setPrimaryColumnBehavior(key as PrimaryColumnBehavior)
                    }
                    isSelected={primaryColumnBehavior === key}
                    title={option.title}
                  />
                ))}
              </ButtonRow>
            </div>

            <div className="settings-control-row settings-control-row-preview settings-control-review">
              <div className="settings-control-copy">
                <h3>Review Cards</h3>
                <DemoReview />
              </div>
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
            </div>

            <div className="settings-control-row settings-control-navigation">
              <div className="settings-control-copy">
                <h3>Navigation Bar</h3>
                <NavigationDetails />
              </div>
              <ButtonRow>
                {Object.entries(navigationOptions).map(([key, option]) => (
                  <SettingButton
                    key={key}
                    label={option.label}
                    onClick={() =>
                      setNavigationBehavior(key as NavigationBehavior)
                    }
                    isSelected={navigationBehavior === key}
                    title={option.title}
                  />
                ))}
              </ButtonRow>
            </div>
          </div>
        </SettingCard>
      </section>
    </div>
  );
}
