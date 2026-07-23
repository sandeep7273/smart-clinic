# Mobile CI/CD Pipeline

The GitHub Actions workflow `.github/workflows/mobile-ui-build.yml` automates the React Native mobile build process.

## What the Pipeline Does

- Runs `npm ci` for reproducible dependency installation.
- Runs the Jest test suite.
- Automatically sets build numbers from `github.run_number` or the manual `build_number` input.
- Builds Android release APK and AAB artifacts.
- Builds a signed iOS archive and exports an IPA on push/manual runs.
- Uploads Android and iOS build artifacts to the workflow run.

## Build Number Strategy

The workflow sets:

- Android `versionCode` from `APP_BUILD_NUMBER`.
- Android `versionName` from `APP_VERSION_NAME`.
- iOS `CURRENT_PROJECT_VERSION` from `APP_BUILD_NUMBER`.
- iOS `MARKETING_VERSION` from `APP_VERSION_NAME`.

Manual workflow dispatch can override both values. Otherwise, `APP_BUILD_NUMBER` defaults to `github.run_number` and `APP_VERSION_NAME` defaults to `1.0`.

## Android Signing Secrets

Add these repository secrets to produce a properly signed Android release build:

| Secret                      | Description                         |
| --------------------------- | ----------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Base64-encoded upload keystore file |
| `ANDROID_KEY_ALIAS`         | Keystore key alias                  |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password                   |
| `ANDROID_KEY_PASSWORD`      | Key password                        |

If these secrets are absent, the workflow still builds APK/AAB artifacts using the debug signing fallback configured in Gradle. This is useful for CI verification but not for store release.

## iOS Signing Secrets

Add these repository secrets to build and export the iOS IPA:

| Secret                            | Description                                          |
| --------------------------------- | ---------------------------------------------------- |
| `IOS_CERTIFICATE_P12_BASE64`      | Base64-encoded Apple distribution certificate `.p12` |
| `IOS_CERTIFICATE_PASSWORD`        | Password for the `.p12` file                         |
| `IOS_KEYCHAIN_PASSWORD`           | Temporary CI keychain password                       |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile                  |
| `IOS_PROVISIONING_PROFILE_NAME`   | Provisioning profile display name                    |
| `IOS_TEAM_ID`                     | Apple Developer Team ID                              |

Optional repository variable:

| Variable            | Default  | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `IOS_EXPORT_METHOD` | `ad-hoc` | Export method, such as `ad-hoc`, `app-store`, `enterprise`, or `development` |

The iOS job runs on push and manual dispatch, not pull requests, because signed IPA export requires protected Apple signing secrets.

## Local Build Commands

From `mobile_ui_app`:

```bash
npm test -- --runInBand
npm run build:android:apk -- -PAPP_VERSION_CODE=2 -PAPP_VERSION_NAME=1.0.1
npm run build:android:aab -- -PAPP_VERSION_CODE=2 -PAPP_VERSION_NAME=1.0.1
```

For iOS, install pods first:

```bash
bundle install
bundle exec pod install --project-directory=ios
npm run build:ios:archive
npm run build:ios:ipa
```
