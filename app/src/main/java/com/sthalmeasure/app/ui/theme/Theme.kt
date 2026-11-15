package com.sthalmeasure.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sthalmeasure.app.R

val EmeraldDeep = Color(0xFF064E3B)
val EmeraldPrimary = Color(0xFF059669)
val EmeraldContainer = Color(0xFFD1FAE5)
val EmeraldBright = Color(0xFF10B981)
val AmberSurvey = Color(0xFFD97706)
val AmberContainer = Color(0xFFFEF3C7)
val TealSurvey = Color(0xFF0D9488)
val SlateInk = Color(0xFF0F172A)
val SlateMuted = Color(0xFF475569)
val PaperBackground = Color(0xFFF6F9F7)
val CardSurface = Color(0xFFFFFFFF)
val HairlineBorder = Color(0xFFDCE6E0)
val RoseAlert = Color(0xFFDC2626)

private val LightColors = lightColorScheme(
    primary = EmeraldPrimary,
    onPrimary = Color.White,
    primaryContainer = EmeraldContainer,
    onPrimaryContainer = EmeraldDeep,
    secondary = TealSurvey,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFCCFBF1),
    onSecondaryContainer = Color(0xFF134E4A),
    tertiary = AmberSurvey,
    onTertiary = Color.White,
    tertiaryContainer = AmberContainer,
    onTertiaryContainer = Color(0xFF78350F),
    background = PaperBackground,
    onBackground = SlateInk,
    surface = CardSurface,
    onSurface = SlateInk,
    surfaceVariant = Color(0xFFEDF3F0),
    onSurfaceVariant = SlateMuted,
    outline = HairlineBorder,
    error = RoseAlert,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = EmeraldBright,
    onPrimary = Color(0xFF022C22),
    primaryContainer = EmeraldDeep,
    onPrimaryContainer = EmeraldContainer,
    secondary = Color(0xFF2DD4BF),
    onSecondary = Color(0xFF042F2E),
    tertiary = Color(0xFFFBBF24),
    onTertiary = Color(0xFF451A03),
    background = Color(0xFF0B1411),
    onBackground = Color(0xFFE6F0EC),
    surface = Color(0xFF121E1A),
    onSurface = Color(0xFFE6F0EC),
    surfaceVariant = Color(0xFF1A2B25),
    onSurfaceVariant = Color(0xFF9FB5AC),
    outline = Color(0xFF273D35),
    error = Color(0xFFF87171),
    onError = Color(0xFF450A0A)
)

val SthalSans = FontFamily(
    Font(R.font.plus_jakarta_sans, FontWeight.Normal),
    Font(R.font.plus_jakarta_sans, FontWeight.Medium),
    Font(R.font.plus_jakarta_sans, FontWeight.SemiBold),
    Font(R.font.plus_jakarta_sans, FontWeight.Bold)
)

val SthalMono = FontFamily(
    Font(R.font.jetbrains_mono, FontWeight.Normal),
    Font(R.font.jetbrains_mono, FontWeight.Medium),
    Font(R.font.jetbrains_mono, FontWeight.Bold)
)

val SthalTypography = Typography(
    headlineMedium = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    ),
    titleLarge = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 19.sp
    ),
    labelLarge = TextStyle(
        fontFamily = SthalSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp
    ),
    labelMedium = TextStyle(
        fontFamily = SthalMono,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        fontFeatureSettings = "tnum"
    ),
    labelSmall = TextStyle(
        fontFamily = SthalMono,
        fontWeight = FontWeight.Normal,
        fontSize = 11.sp,
        fontFeatureSettings = "tnum"
    )
)

val SthalShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp)
)

@Composable
fun SthalMeasureTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = SthalTypography,
        shapes = SthalShapes,
        content = content
    )
}
