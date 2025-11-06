plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.trackify_vts"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.0.12077973"   // ✅ add this line

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // Default ID (used only when no flavor is specified)
        applicationId = "com.example.trackify_vts"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // ✅ Define both debug & release properly
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true              // Enables code shrinking
            isShrinkResources = true            // Removes unused resources
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // Temporary
        }

        getByName("debug") {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    // ✅ Product Flavors for Driver & Parent apps
    flavorDimensions += "default"

    productFlavors {
        create("dev") {
            dimension = "default"
            applicationId = "com.trackify.dev"
            resValue("string", "app_name", "Trackify Dev")
        }
        create("driver") {
            dimension = "default"
            applicationId = "com.trackify.driver"
            resValue("string", "app_name", "Trackify Driver")
        }
        create("parent") {
            dimension = "default"
            applicationId = "com.trackify.parent"
            resValue("string", "app_name", "Trackify Parent")
        }
    }
}


flutter {
    source = "../.."
}
