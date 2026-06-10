# Vitest Frontend Coverage Report

## Summary
- **Statements**: 93.01% (4686/5038)
- **Branches**: 82.96% (3462/4173)
- **Functions**: 93.7% (1265/1350)
- **Lines**: 94.68% (4398/4645)

## Detailed Coverage (Targeted Areas)

### Pages/Settings/Provider
| File | % Stmts | % Branch | % Funcs | % Lines |
| :--- | :--- | :--- | :--- | :--- |
| SettingsProvider.tsx | 100 | 88.88 | 100 | 100 |
| applyInitialSettings.ts | 100 | 100 | 100 | 100 |
| settingsContext.ts | 100 | 100 | 100 | 100 |

    Test Files  189 passed (189)
    Tests  876 passed (876)
    Start at  22:24:51 | Duration  49.68s (transform 17.08s, setup 66.60s, import 84.45s, tests 30.56s, environment 797.39s)

 % Coverage report from v8

File                                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------
All files                                  |   93.01 |    82.96 |    93.7 |   94.68 |
 app                                       |     100 |      100 |     100 |     100 |
  main.tsx                                 |     100 |      100 |     100 |     100 |
 app/layouts                               |     100 |      100 |     100 |     100 |
  NavigationBar.tsx                        |     100 |      100 |     100 |     100 |
  navigation.meta.tsx                      |     100 |      100 |     100 |     100 |
 app/nav-components                        |     100 |    91.66 |     100 |     100 |
  BrandBlock.tsx                           |     100 |      100 |     100 |     100 |
  MainHeader.tsx                           |     100 |      100 |     100 |     100 |
  NavButton.tsx                            |     100 |       75 |     100 |     100 | 57-68
  SearchBar.tsx                            |     100 |      100 |     100 |     100 |
  ThemeToggleButton.tsx                    |     100 |      100 |     100 |     100 |
  UserBlock.tsx                            |     100 |      100 |     100 |     100 |
 global-components                         |    99.6 |     95.4 |   98.07 |     100 |
  AuthProvider.tsx                         |     100 |      100 |     100 |     100 |
  BannerNotificationProvider.tsx           |     100 |      100 |     100 |     100 |
  ChatMarkdown.tsx                         |     100 |    96.96 |     100 |     100 | 218
  CheckBoxToggle.tsx                       |     100 |      100 |     100 |     100 |
  CloseButton.tsx                          |     100 |      100 |     100 |     100 |
  ConfirmModal.tsx                         |     100 |      100 |     100 |     100 |
  DropDownMenu.tsx                         |     100 |    72.41 |     100 |     100 | 35-41,73,147,185-196
  FloatingInputField.tsx                   |     100 |       95 |     100 |     100 | 77
  Modal.tsx                                |     100 |    95.23 |     100 |     100 | 53,62
  ModalDivider.tsx                         |     100 |      100 |     100 |     100 |
  ModalHeader.tsx                          |     100 |      100 |     100 |     100 |
  PlaceHolderText.tsx                      |     100 |      100 |     100 |     100 |
  SearchBar.tsx                            |     100 |      100 |     100 |     100 |
  SlidingToggle.tsx                        |     100 |      100 |     100 |     100 |
  authContext.ts                           |     100 |      100 |      50 |     100 |
  bannerNotificationContext.ts             |     100 |      100 |     100 |     100 |
  button.tsx                               |   95.83 |      100 |    90.9 |     100 |
 global-services                           |   98.97 |    91.34 |     100 |   98.89 |
  api.ts                                   |     100 |    94.44 |     100 |     100 | 69,80
  apiBaseUrl.ts                            |     100 |    86.66 |     100 |     100 | 9,13
  auth.ts                                  |   97.46 |    91.66 |     100 |   97.18 | 88,107
  database.ts                              |     100 |      100 |     100 |     100 |
  firebase.ts                              |     100 |       50 |     100 |     100 | 17
  input-validation.ts                      |     100 |      100 |     100 |     100 |
  readEmails.ts                            |     100 |    66.66 |     100 |     100 | 65
  router.ts                                |     100 |      100 |     100 |     100 |
  useBrandImage.ts                         |     100 |      100 |     100 |     100 |
  writeJobsToDB.ts                         |     100 |      100 |     100 |     100 |
 pages/Resume                              |   88.88 |    80.81 |   85.71 |   90.37 |
  Resume.tsx                               |   71.42 |    66.66 |      20 |   73.52 | 247-250,263-266,274
  chatUtils.ts                             |     100 |      100 |     100 |     100 |
  documentViewModel.tsx                    |   93.15 |    86.76 |    92.3 |   92.64 | 102-103,111-112,147
  formatting.ts                            |   95.23 |      100 |      80 |     100 |
  resume.meta.tsx                          |     100 |      100 |     100 |     100 |
  resumeApi.ts                             |   96.33 |    87.69 |     100 |   98.07 | 169,249
  resumeData.ts                            |     100 |    92.64 |     100 |     100 | 49,132,165-174
  resumeDiagnostics.ts                     |   70.21 |    63.15 |   69.56 |   73.17 | 157-158,162-166,171,179-212
  resumeTypography.ts                      |     100 |      100 |     100 |     100 |
  types.ts                                 |       0 |        0 |       0 |       0 |
 pages/Resume/components                   |   97.04 |    84.96 |   97.76 |   99.35 |
  AutoResizeTextarea.tsx                   |   96.66 |     87.5 |     100 |     100 | 11
  CloneResumeModal.tsx                     |     100 |      100 |     100 |     100 |
  DeleteResumeModal.tsx                    |     100 |       50 |     100 |     100 | 28
  DocumentSection.tsx                      |     100 |      100 |     100 |     100 |
  OverlayInput.tsx                         |   93.47 |    92.95 |   88.88 |   95.45 | 74,163
  PageStyleShelf.tsx                       |     100 |      100 |     100 |     100 |
  ResumeAlerts.tsx                         |     100 |      100 |     100 |     100 |
  ResumeCanvas.tsx                         |    87.5 |    91.66 |     100 |     100 | 50
  ResumeChatRail.tsx                       |     100 |    80.86 |     100 |     100 | 60-67,96,132-151,162-180,204,216,224,242-245,267
  ResumeDocumentEditor.tsx                 |   99.29 |    86.83 |     100 |     100 | ...399,417,435,459,494,565,567,571,588-622,673-678,723,733-735,765,786-816,863,895,1031,1039
  ResumeDocumentSurface.tsx                |     100 |    85.15 |     100 |     100 | 29,32,34-37,185-190,197-208,242,262-267,273,284,332-337,342
  ResumeGlobalStyles.tsx                   |     100 |      100 |     100 |     100 |
  ResumeHeader.tsx                         |   83.33 |    87.75 |      75 |     100 | 63-83,102,107
  ResumePdfPreview.tsx                     |     100 |    55.55 |     100 |     100 | 29-43,46-84
  ResumePrintDocument.tsx                  |     100 |    85.03 |     100 |     100 | 16,19,21-24,169-174,181-192,226,246-251,257,268,316-321,326
  ResumeRailDivider.tsx                    |     100 |      100 |     100 |     100 |
  ResumeSwitcherRail.tsx                   |    91.3 |    73.91 |     100 |     100 | 36-50,117-119,135-138,157-195
  ResumeWorkspace.tsx                      |   89.36 |       60 |      80 |   97.61 | 174
 pages/Resume/hooks                        |   90.83 |    70.04 |   93.33 |   92.84 |
  useResumeChat.ts                         |   85.89 |    73.03 |   92.59 |   90.07 | 217-226,266,271-275
  useResumeDocumentEditing.ts              |     100 |    79.31 |     100 |     100 | 38,49,93-100,123,127,143,145,158-159,167,171-172,203,212,216-226,228,241,250,254-255,286,295
  useResumeFormatting.ts                   |   98.08 |    71.42 |     100 |     100 | 53-119,177,194,236-302
  useResumePdfPreview.ts                   |     100 |    93.75 |     100 |     100 | 55
  useResumePersistence.ts                  |   82.75 |    51.21 |   85.71 |   83.33 | 52-54,60,99-103,138-139,163-168,175-187,222-223,236,260-261
  useResumeRewriteSuggestions.ts           |   86.08 |    67.61 |   84.61 |   90.24 | 44-46,158-161,233-235,277,329-335,347,368
 pages/about                               |     100 |      100 |     100 |     100 |
  AboutPage.tsx                            |     100 |      100 |     100 |     100 |
  about.meta.tsx                           |     100 |      100 |     100 |     100 |
 pages/dashboard                           |     100 |      100 |     100 |     100 |
  DashboardPage.tsx                        |     100 |      100 |     100 |     100 |
  DashboardStageCards.tsx                  |     100 |      100 |     100 |     100 |
  dashboard.meta.tsx                       |     100 |      100 |     100 |     100 |
 pages/dashboard/dashboard-components      |   90.31 |    74.17 |   83.48 |   92.69 |
  ActivityHeatmapCard.tsx                  |   75.75 |    49.31 |   66.66 |   79.67 | 90,114-115,197-219,235-245,268,310
  AppsByStageCard.tsx                      |   95.87 |    77.55 |     100 |   97.77 | 61-62
  AppsOverTimeCard.tsx                     |   90.62 |    74.24 |     100 |   94.06 | 94-95,264,275,281,298,309
  AvgAppsPerWeekCard.tsx                   |   95.74 |    84.44 |     100 |   97.75 | 81-82
  AvgTimeInStageCard.tsx                   |   95.38 |    80.35 |     100 |   98.27 | 117
  Card.tsx                                 |   73.58 |    59.09 |      50 |      75 | 49,124-304,519
  GritCard.tsx                             |     100 |    76.31 |     100 |     100 | 43,157-199,247-265
  Modal.tsx                                |     100 |      100 |     100 |     100 |
  SplitByStageCard.tsx                     |   96.96 |       78 |     100 |   97.89 | 61-62
  chartDescText.ts                         |     100 |      100 |     100 |     100 |
  chartSetup.ts                            |     100 |    85.71 |     100 |     100 | 54-61
  chartTheme.ts                            |      75 |      100 |      50 |     100 |
  index.ts                                 |       0 |        0 |       0 |       0 |
 pages/dashboard/hooks                     |      95 |     87.5 |     100 |   94.11 |
  useDashboardRealtimeRefresh.ts           |      95 |     87.5 |     100 |   94.11 | 22
 pages/home                                |   92.68 |    85.71 |      80 |    92.1 |
  HomePage.tsx                             |    92.5 |    85.71 |      80 |   91.89 | 47,51,181
  home.meta.tsx                            |     100 |      100 |     100 |     100 |
 pages/home/contexts                       |     100 |      100 |     100 |     100 |
  DragContext.tsx                          |     100 |      100 |     100 |     100 |
  JobCardContext.tsx                       |     100 |      100 |     100 |     100 |
  MultiSelectContext.tsx                   |     100 |      100 |     100 |     100 |
  SelectedJobsContext.tsx                  |     100 |      100 |     100 |     100 |
  UndoRedoContext.tsx                      |     100 |      100 |     100 |     100 |
 pages/home/home-components/column         |   96.29 |     92.2 |     100 |   98.07 |
  Column.tsx                               |   96.87 |    90.38 |     100 |     100 | 47,103-112,156
  ColumnMap.ts                             |     100 |      100 |     100 |     100 |
  ColumnTitle.tsx                          |   94.73 |       96 |     100 |   94.73 | 49
  EmptyColumnPlaceholder.tsx               |     100 |      100 |     100 |     100 |
  KanBanColumn.ts                          |     100 |      100 |     100 |     100 |
 pages/home/home-components/control-bar    |   97.72 |    83.63 |   94.73 |   97.56 |
  ArchiveModalButton.tsx                   |     100 |      100 |     100 |     100 |
  ConnectEmailButton.tsx                   |   88.88 |    55.55 |   66.66 |   88.88 | 26
  ControlBar.tsx                           |     100 |       75 |     100 |     100 | 13
  ControlBarButton.tsx                     |     100 |      100 |     100 |     100 |
  ExpandCollapseButton.tsx                 |     100 |    63.63 |     100 |     100 | 14-20
  FilterButton.tsx                         |     100 |      100 |     100 |     100 |
  MultiSelectButton.tsx                    |     100 |      100 |     100 |     100 |
  NewApplicationButton.tsx                 |     100 |      100 |     100 |     100 |
  ReadAllButton.tsx                        |     100 |      100 |     100 |     100 |
  TrashModalButton.tsx                     |     100 |      100 |     100 |     100 |
 pages/home/home-components/job-card       |   97.36 |    93.33 |     100 |   97.93 |
  JobCardButton.tsx                        |     100 |      100 |     100 |     100 |
  JobCardButtonRow.tsx                     |     100 |      100 |     100 |     100 |
  JobCardContainer.tsx                     |     100 |    98.24 |     100 |     100 | 142
  JobCardContent.tsx                       |     100 |     87.5 |     100 |     100 | 33
  JobCardReviewHeader.tsx                  |     100 |     62.5 |     100 |     100 | 9-19
  JobCardTitle.tsx                         |   95.16 |     92.3 |     100 |   96.61 | 139,151
  JobCardView.tsx                          |     100 |       96 |     100 |     100 | 33
  JobCards.tsx                             |   95.83 |     87.5 |     100 |   95.65 | 55
 pages/home/home-components/modal          |   84.61 |    78.78 |   80.55 |   86.44 |
  ApplicationModal.tsx                     |   87.27 |       75 |   76.47 |      88 | 71-72,77,204,211,246
  ConnectEmailModal.tsx                    |     100 |      100 |     100 |     100 |
  MultiSelectBar.tsx                       |   86.41 |    66.66 |   81.81 |   85.13 | 58,67-69,102-103,135-136,180-181,202-203
  TrashArchiveModal.tsx                    |   81.69 |       76 |   73.91 |   85.07 | 105-111,133,224-229,236,311
  UndoRedo.tsx                             |   78.57 |    82.92 |     100 |   86.11 | 37,60-61,75-76
 pages/home/home-components/page           |   93.47 |    96.66 |    87.5 |   95.55 |
  HomeLoadingSkeleton.tsx                  |     100 |      100 |     100 |     100 |
  HomePageContentProviders.tsx             |       0 |      100 |       0 |       0 | 13
  KanbanContent.tsx                        |   95.83 |    95.23 |     100 |     100 | 17
  LoadingAnimation.tsx                     |     100 |      100 |     100 |     100 |
  PageContent.tsx                          |       0 |      100 |       0 |       0 | 2
  PageShadow.tsx                           |     100 |      100 |     100 |     100 |
 pages/home/hooks                          |   92.75 |    79.35 |   95.55 |      96 |
  applyIntentToJob.ts                      |     100 |      100 |     100 |     100 |
  sortJobs.ts                              |     100 |    84.61 |     100 |     100 | 11-16
  useArchiveActions.ts                     |   91.17 |    73.07 |   89.47 |   94.54 | 24-26
  useDeleteByJobId.ts                      |     100 |    85.71 |     100 |     100 | 27
  useDeleteConfirm.ts                      |     100 |      100 |     100 |     100 |
  useDrag.ts                               |     100 |      100 |     100 |     100 |
  useIsMultiSelecting.ts                   |     100 |      100 |     100 |     100 |
  useJobAction.ts                          |     100 |      100 |     100 |     100 |
  useJobCard.ts                            |     100 |      100 |     100 |     100 |
  useJobCardDrag.ts                        |   88.88 |       80 |   94.11 |   94.44 | 195-200
  useJobMutation.ts                        |   94.28 |    82.85 |     100 |   97.05 | 87
  useJobRealtime.ts                        |     100 |      100 |     100 |     100 |
  useJobSearchAndSort.ts                   |     100 |       75 |     100 |     100 | 31
  useJobsLoader.ts                         |   94.87 |       80 |     100 |     100 | 16,56-63
  useKanbanColumns.ts                      |   94.11 |    93.33 |     100 |   93.75 | 54
  useKanbanJobs.tsx                        |      92 |    78.78 |     100 |      95 | 38
  useOnDragEnd.ts                          |     100 |      100 |     100 |     100 |
  useOpenGmailMessage.ts                   |     100 |      100 |     100 |     100 |
  useRealTimeJobs.ts                       |   83.33 |       45 |    90.9 |   89.36 | 47-52,75
  useSelectedJobs.ts                       |     100 |      100 |     100 |     100 |
  useTrashActions.ts                       |   89.33 |    60.71 |    90.9 |   92.98 | 28-31
  useUndoRedo.ts                           |     100 |      100 |     100 |     100 |
 pages/home/providers                      |     100 |      100 |     100 |     100 |
  DragProvider.tsx                         |     100 |      100 |     100 |     100 |
  JobCardProvider.tsx                      |     100 |      100 |     100 |     100 |
  MultiSelectProvider.tsx                  |     100 |      100 |     100 |     100 |
  SelectedJobsProvider.tsx                 |     100 |      100 |     100 |     100 |
  UndoRedoProvider.tsx                     |     100 |      100 |     100 |     100 |
 pages/home/utils                          |   89.89 |    83.21 |   96.66 |    90.9 |
  applyJobChange.ts                        |   80.48 |    57.14 |    90.9 |   82.85 | 36-37,61-62,79-80
  checkGmailStatus.ts                      |     100 |      100 |     100 |     100 |
  convertTime.ts                           |     100 |      100 |     100 |     100 |
  convertToJobCard.ts                      |     100 |    92.13 |     100 |     100 | 53,59,86-87,93
  formatInboxMessage.ts                    |   92.59 |    64.28 |     100 |      92 | 18-19
  jobDisplayColumn.ts                      |     100 |      100 |     100 |     100 |
  jobLocalChangeEvent.ts                   |     100 |      100 |     100 |     100 |
 pages/landing                             |   87.87 |    66.66 |   85.71 |   87.87 |
  LandingPage.tsx                          |      75 |      100 |      50 |      75 | 38
  landing.api.ts                           |   89.28 |    66.66 |     100 |   89.28 | 25-28,90
  landing.meta.tsx                         |     100 |      100 |     100 |     100 |
 pages/landing/landing-components          |     100 |    88.88 |     100 |     100 |
  LandingForm.tsx                          |     100 |      100 |     100 |     100 |
  LogIn.tsx                                |     100 |     87.5 |     100 |     100 | 33-37
  QuickSignIn.tsx                          |     100 |      100 |     100 |     100 |
 pages/settings                            |     100 |      100 |     100 |     100 |
  SettingsPage.tsx                         |     100 |      100 |     100 |     100 |
  settings.meta.tsx                        |     100 |      100 |     100 |     100 |
 pages/settings/account                    |   84.42 |    86.66 |   84.21 |   85.12 |
  AccountSettings.tsx                      |   84.42 |    86.66 |   84.21 |   85.12 | 74-76,95-96,139-140,188-190,218-220,230-231,377-387,397
 pages/settings/account/account-components |    97.1 |    94.73 |   94.44 |   96.92 |
  AccountSections.tsx                      |     100 |      100 |     100 |     100 |
  ChangePhotoModal.tsx                     |   95.55 |     90.9 |    87.5 |   95.34 | 46,69
  DaysToSync.tsx                           |     100 |      100 |     100 |     100 |
  DeleteAccountModal.tsx                   |     100 |      100 |     100 |     100 |
  UnlinkGmailModal.tsx                     |     100 |      100 |     100 |     100 |
 pages/settings/display                    |     100 |      100 |     100 |     100 |
  DisplaySettings.tsx                      |     100 |      100 |     100 |     100 |
 pages/settings/display/display-components |     100 |    97.77 |     100 |     100 |
  Cards.tsx                                |     100 |      100 |     100 |     100 |
  ContrastDetails.tsx                      |     100 |      100 |     100 |     100 |
  DemoReview.tsx                           |     100 |    92.85 |     100 |     100 | 19
  MotionDetails.tsx                        |     100 |      100 |     100 |     100 |
  NavigationDetails.tsx                    |     100 |      100 |     100 |     100 |
  PrimaryColumnDetails.tsx                 |     100 |      100 |     100 |     100 |
  TextSizeDetails.tsx                      |     100 |      100 |     100 |     100 |
  ThemeDetails.tsx                         |     100 |      100 |     100 |     100 |
 pages/settings/provider                   |     100 |    92.85 |     100 |     100 |
  SettingsProvider.tsx                     |     100 |    88.88 |     100 |     100 | 21,55,86-87
  applyInitialSettings.ts                  |     100 |      100 |     100 |     100 |
  settingKeys.ts                           |     100 |      100 |     100 |     100 |
  settingOptions.ts                        |     100 |      100 |     100 |     100 |
  settingsContext.ts                       |     100 |      100 |     100 |     100 |
  settingsTypes.ts                         |       0 |        0 |       0 |       0 |
 types                                     |     100 |      100 |     100 |     100 |
  dragTarget.ts                            |       0 |        0 |       0 |       0 |
  jobApplicationRow.ts                     |       0 |        0 |       0 |       0 |
  jobBroadcastPayload.ts                   |       0 |        0 |       0 |       0 |
  jobCardType.ts                           |       0 |        0 |       0 |       0 |
  jobIntent.ts                             |       0 |        0 |       0 |       0 |
  undoAction.ts                            |       0 |        0 |       0 |       0 |
  validColumns.ts                          |     100 |      100 |     100 |     100 |
 utils                                     |     100 |    92.85 |     100 |     100 |
  getCSSVar.ts                             |     100 |      100 |     100 |     100 |
  getThemeData.ts                          |     100 |      100 |     100 |     100 |
  useGritScore.ts                          |     100 |    91.66 |     100 |     100 | 28,48
