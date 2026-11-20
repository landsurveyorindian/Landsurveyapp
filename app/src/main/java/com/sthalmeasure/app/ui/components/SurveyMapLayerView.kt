package com.sthalmeasure.app.ui.components

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.MotionEvent
import android.view.ViewGroup
import androidx.compose.runtime.DisposableEffect
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.CoordinateValidator
import com.sthalmeasure.app.domain.GeoAndGpsUtils
import com.sthalmeasure.app.domain.GisFeature
import com.sthalmeasure.app.domain.ImportedCrsType
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.ShapefileSupport
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.cos

enum class MapBaseLayer(
    val id: String,
    val label: String,
    val subtitle: String
) {
    BHUVAN_HYBRID("bhuvan_2d", "Bhuvan Hybrid", "ISRO NRSC Bhuvan 2D + Satellite Hybrid"),
    BHUVAN_2D_NRSC("bhuvan_2d_map", "Bhuvan 2D", "ISRO NRSC Bhuvan 2D Topo Layer"),
    GOOGLE_STREETS("google_streets", "Google Maps", "Google Road & Landmark Layer"),
    GOOGLE_SATELLITE("google_satellite", "Google Satellite", "Google Aerial Satellite Layer"),
    GOOGLE_HYBRID("google_hybrid", "Google Hybrid", "Google Satellite + Roads Layer")
}

enum class BhuvanOverlayLayer(
    val id: String,
    val label: String,
    val wmsLayer: String
) {
    NONE("none", "No Overlay", ""),
    CADASTRAL("CADASTRAL_OVERLAY", "Cadastral Boundaries", "cadastral:cadastral_india"),
    SISDP_VILLAGE("SISDP_VILLAGE", "SISDP Village", "basemap:admin_group"),
    LULC_50K("BHUVAN_LULC_50K", "LULC 50K", "lulc:AP_LULC50K_1112")
}

object SurveyMapConfig {
    const val BHUVAN_WMS_ENDPOINT = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms"
    const val BHUVAN_VEC1_TMS_BASE = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0"
    const val BHUVAN_VEC2_TMS_BASE = "https://bhuvan-vec2.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0"
    const val BHUVAN_2D_NRSC_LAYER = "india3"
    const val BHUVAN_ADMIN_LAYER = "basemap:admin_group"
    const val BHUVAN_CADASTRAL_LAYER = "cadastral:cadastral_india"

    private val availableLulcStates = setOf(
        "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ",
        "HP", "HR", "JH", "JK", "KA", "KL", "LD", "MH", "ML", "MN", "MP", "MZ",
        "NL", "OR", "PB", "PY", "RJ", "SK", "TN", "TR", "UK", "UP", "WB"
    )

    fun lulcLayerForStateCode(stateCode: String): String {
        val normalized = when (val c = stateCode.trim().uppercase()) {
            "TG" -> "AP"
            "OD" -> "OR"
            "LA" -> "JK"
            else -> if (c in availableLulcStates) c else "AP"
        }
        return "lulc:${normalized}_LULC50K_1112"
    }

    fun buildBhuvanTmsUrlTemplate(layerName: String, hostBase: String = BHUVAN_VEC1_TMS_BASE): String =
        "$hostBase/$layerName@EPSG:900913@png/{z}/{x}/{y}.png"

    fun buildGoogleTileUrlTemplate(layer: MapBaseLayer): String = when (layer) {
        MapBaseLayer.GOOGLE_STREETS -> "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        MapBaseLayer.GOOGLE_SATELLITE -> "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        MapBaseLayer.GOOGLE_HYBRID -> "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        MapBaseLayer.BHUVAN_HYBRID, MapBaseLayer.BHUVAN_2D_NRSC -> ""
    }

    fun buildBhuvanWmsPreviewUrl(lat: Double, lng: Double, layerId: String, stateCode: String = "AP"): String {
        val wmsLayer = when (layerId) {
            "CADASTRAL_OVERLAY", BhuvanOverlayLayer.CADASTRAL.wmsLayer, "cadastral:cadastral" -> BHUVAN_CADASTRAL_LAYER
            "SISDP_VILLAGE", BhuvanOverlayLayer.SISDP_VILLAGE.wmsLayer, "sisdp:village_boundary" -> BHUVAN_ADMIN_LAYER
            "BHUVAN_LULC_50K", BhuvanOverlayLayer.LULC_50K.wmsLayer -> lulcLayerForStateCode(stateCode)
            else -> BHUVAN_2D_NRSC_LAYER
        }
        val d = 0.0025
        val minLon = lng - d
        val minLat = lat - d
        val maxLon = lng + d
        val maxLat = lat + d
        return "$BHUVAN_WMS_ENDPOINT?service=WMS&version=1.1.1&request=GetMap" +
            "&layers=$wmsLayer&styles=&bbox=$minLon,$minLat,$maxLon,$maxLat" +
            "&width=512&height=384&srs=EPSG:4326&format=image/png&transparent=true"
    }

    fun stateDefaultCenter(stateName: String): Pair<Double, Double> = when (stateName.trim()) {
        "All-India" -> 21.1458 to 79.0882
        "Andhra Pradesh" -> 16.3450 to 80.5050
        "Arunachal Pradesh" -> 27.0844 to 93.6053
        "Assam" -> 26.2500 to 91.6000
        "Bihar" -> 25.5941 to 85.1376
        "Chhattisgarh" -> 21.2514 to 81.6296
        "Goa" -> 15.4909 to 73.8278
        "Gujarat" -> 23.0225 to 72.5714
        "Haryana" -> 29.0588 to 76.0856
        "Himachal Pradesh" -> 31.1048 to 77.1734
        "Jharkhand" -> 23.3441 to 85.3096
        "Karnataka" -> 12.9716 to 77.5946
        "Kerala" -> 10.8505 to 76.2711
        "Madhya Pradesh" -> 23.2599 to 77.4126
        "Maharashtra" -> 19.0760 to 72.8777
        "Manipur" -> 24.8170 to 93.9368
        "Meghalaya" -> 25.5788 to 91.8933
        "Mizoram" -> 23.7271 to 92.7176
        "Nagaland" -> 25.6751 to 94.1086
        "Odisha" -> 20.2961 to 85.8245
        "Punjab" -> 30.7333 to 76.7794
        "Rajasthan" -> 26.9124 to 75.7873
        "Sikkim" -> 27.3314 to 88.6138
        "Tamil Nadu" -> 13.0827 to 80.2707
        "Telangana" -> 17.4500 to 78.6850
        "Tripura" -> 23.8315 to 91.2868
        "Uttar Pradesh" -> 26.8467 to 80.9462
        "Uttarakhand" -> 30.3165 to 78.0322
        "West Bengal" -> 22.5726 to 88.3639
        "Delhi (NCT)" -> 28.6139 to 77.2090
        "Jammu & Kashmir", "Jammu and Kashmir" -> 34.0837 to 74.7973
        "Ladakh" -> 34.1526 to 77.5771
        "Puducherry" -> 11.9416 to 79.8083
        "Chandigarh" -> 30.7333 to 76.7794
        "Andaman and Nicobar Islands" -> 11.6234 to 92.7265
        "Dadra and Nagar Haveli and Daman and Diu" -> 20.2738 to 73.0155
        "Lakshadweep" -> 10.5667 to 72.6417
        else -> 21.1458 to 79.0882
    }

    fun looksLikeIndiaWgs84(points: List<CadPoint>): Boolean {
        if (points.isEmpty()) return false
        return points.all { it.x in 65.0..99.0 && it.y in 5.0..38.5 }
    }

    fun projectPointsToLatLng(
        points: List<CadPoint>,
        anchorLat: Double,
        anchorLng: Double,
        crsHint: String = "",
        stateHint: String = "Andhra Pradesh"
    ): List<Pair<Double, Double>> {
        if (points.isEmpty()) return emptyList()
        val crsUpper = crsHint.uppercase()
        val utmZoneMatch = Regex("""(?:UTM[_\s-]*Zone[_\s-]*|326)(\d{1,2})""", RegexOption.IGNORE_CASE).find(crsHint)
        val utmZoneFromHint = utmZoneMatch?.groupValues?.getOrNull(1)?.toIntOrNull()?.takeIf { it in 1..60 }

        val crsType = when {
            (crsUpper.contains("WGS84") || crsUpper.contains("EPSG:4326")) &&
                !crsUpper.contains("UTM") &&
                points.all { it.x in -180.0..180.0 && it.y in -90.0..90.0 } -> ImportedCrsType.WGS84
            crsUpper.contains("3857") || crsUpper.contains("900913") ||
                (crsUpper.contains("MERCATOR") && !crsUpper.contains("TRANSVERSE")) -> ImportedCrsType.WEB_MERCATOR
            crsUpper.contains("UTM") && points.all { it.x in 100_000.0..900_000.0 && it.y in 0.0..10_000_000.0 } -> ImportedCrsType.UTM
            looksLikeIndiaWgs84(points) -> ImportedCrsType.WGS84
            points.all { it.x in 5.0..38.5 && it.y in 65.0..99.0 } -> ImportedCrsType.WGS84_SWAPPED
            points.all { it.x in 7_400_000.0..11_200_000.0 && it.y in 650_000.0..4_600_000.0 } -> ImportedCrsType.WEB_MERCATOR
            points.all { it.x in 150_000.0..860_000.0 && it.y in 650_000.0..4_200_000.0 } -> ImportedCrsType.UTM
            else -> ImportedCrsType.LOCAL_PLANAR
        }
        val origin = points.first()
        val zone = if (crsType == ImportedCrsType.UTM) {
            utmZoneFromHint ?: GeoAndGpsUtils.recommendedUtmZoneForState(stateHint)
        } else null
        return points.map { p ->
            ShapefileSupport.projectPointToLatLng(
                pt = p,
                anchorLat = anchorLat,
                anchorLng = anchorLng,
                originPoint = origin,
                crsType = crsType,
                utmZone = zone,
                stateHint = stateHint
            )
        }
    }

    fun projectFeaturesToLatLng(
        features: List<GisFeature>,
        anchorLat: Double,
        anchorLng: Double,
        crsType: ImportedCrsType,
        utmZone: Int? = null,
        utmHemisphere: Char = 'N',
        tmCentralMeridianDeg: Double? = null,
        tmLatOriginDeg: Double = 0.0,
        tmScaleFactor: Double = 0.9996,
        tmFalseEasting: Double = 500000.0,
        tmFalseNorthing: Double = 0.0,
        unitScaleToMeters: Double = 1.0,
        stateHint: String = "Andhra Pradesh"
    ): List<List<Pair<Double, Double>>> {
        val origin = features.firstOrNull()?.points?.firstOrNull() ?: return emptyList()
        return features.mapNotNull { feat ->
            if (feat.points.size < 2) null
            else feat.points.map { p ->
                ShapefileSupport.projectPointToLatLng(
                    pt = p,
                    anchorLat = anchorLat,
                    anchorLng = anchorLng,
                    originPoint = origin,
                    crsType = crsType,
                    utmZone = utmZone,
                    utmHemisphere = utmHemisphere,
                    tmCentralMeridianDeg = tmCentralMeridianDeg,
                    tmLatOriginDeg = tmLatOriginDeg,
                    tmScaleFactor = tmScaleFactor,
                    tmFalseEasting = tmFalseEasting,
                    tmFalseNorthing = tmFalseNorthing,
                    unitScaleToMeters = unitScaleToMeters,
                    stateHint = stateHint
                )
            }
        }
    }
}

@Composable
fun rememberMyLocationAction(
    onLocationFound: (lat: Double, lng: Double, accuracyMeters: Double) -> Unit,
    onLocationError: (String) -> Unit
): Pair<Boolean, () -> Unit> {
    val context = LocalContext.current
    var busy by remember { mutableStateOf(false) }
    var pendingLocate by remember { mutableStateOf(false) }

    fun fetchLocationNow() {
        busy = true
        fetchSingleFix(
            context = context,
            onSuccess = { lat, lng, acc ->
                busy = false
                onLocationFound(lat, lng, acc)
            },
            onFailure = { msg ->
                busy = false
                onLocationError(msg)
            }
        )
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grantedMap ->
        val granted = grantedMap[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grantedMap[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted && pendingLocate) {
            pendingLocate = false
            fetchLocationNow()
        } else if (!granted) {
            pendingLocate = false
            onLocationError("Location permission denied. Allow location access to center on My Location.")
        }
    }

    val trigger: () -> Unit = {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (hasFine || hasCoarse) {
            fetchLocationNow()
        } else {
            pendingLocate = true
            permLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    return busy to trigger
}

@SuppressLint("MissingPermission")
private fun fetchSingleFix(
    context: Context,
    onSuccess: (lat: Double, lng: Double, acc: Double) -> Unit,
    onFailure: (String) -> Unit
) {
    fun deliverLocation(loc: Location?): Boolean {
        if (loc == null) return false
        val acc = loc.accuracy.toDouble().let { if (it <= 0.0 || !it.isFinite()) 10.0 else it }
        if (!CoordinateValidator.isValidCoordinate(loc.latitude, loc.longitude, acc.coerceAtMost(50.0))) {
            return false
        }
        onSuccess(loc.latitude, loc.longitude, acc)
        return true
    }

    fun tryPlatformFallback(): Boolean {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
        val gps = runCatching { lm.getLastKnownLocation(LocationManager.GPS_PROVIDER) }.getOrNull()
        if (deliverLocation(gps)) return true
        val net = runCatching { lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) }.getOrNull()
        return deliverLocation(net)
    }

    try {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val cts = CancellationTokenSource()
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { current ->
                if (!deliverLocation(current)) {
                    client.lastLocation
                        .addOnSuccessListener { last ->
                            if (!deliverLocation(last) && !tryPlatformFallback()) {
                                onFailure("Unable to get GPS lock right now. Turn on device Location and try again outdoors.")
                            }
                        }
                        .addOnFailureListener {
                            if (!tryPlatformFallback()) {
                                onFailure("Turn on device GPS / Location Services to center on My Location.")
                            }
                        }
                }
            }
            .addOnFailureListener {
                if (!tryPlatformFallback()) {
                    onFailure("Turn on device GPS / Location Services to center on My Location.")
                }
            }
    } catch (_: Throwable) {
        if (!tryPlatformFallback()) {
            onFailure("Location services unavailable on this device.")
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SurveyMapLayerCard(
    title: String,
    activeState: String,
    baseLayer: MapBaseLayer,
    onSelectBaseLayer: (MapBaseLayer) -> Unit,
    overlayLayer: BhuvanOverlayLayer,
    onSelectOverlayLayer: (BhuvanOverlayLayer) -> Unit,
    centerLat: Double,
    centerLng: Double,
    myLocation: Pair<Double, Double>? = null,
    polygonLatLngs: List<Pair<Double, Double>> = emptyList(),
    locating: Boolean = false,
    onMyLocationClick: () -> Unit,
    myLocationButtonTag: String,
    mapContainerTag: String = "survey_map_container",
    mapHeight: Dp = 360.dp,
    allowGoogleLayers: Boolean = true,
    allowBhuvanOverlays: Boolean = true,
    featurePolygonsLatLng: List<List<Pair<Double, Double>>> = emptyList(),
    featurePolygonsClosed: List<Boolean> = emptyList()
) {
    val context = LocalContext.current
    val inPreview = LocalInspectionMode.current
    val isRobolectric = remember {
        Build.FINGERPRINT.contains("robolectric", ignoreCase = true)
    }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var pageLoaded by remember { mutableStateOf(false) }
    var isExpanded by remember { mutableStateOf(false) }
    val effectiveMapHeight = if (isExpanded) 560.dp else mapHeight

    val effectiveFeatures = remember(featurePolygonsLatLng, polygonLatLngs) {
        when {
            featurePolygonsLatLng.isNotEmpty() -> featurePolygonsLatLng.filter { it.size >= 2 }
            polygonLatLngs.size >= 2 -> listOf(polygonLatLngs)
            else -> emptyList()
        }
    }
    val effectiveClosed = remember(effectiveFeatures, featurePolygonsClosed, polygonLatLngs) {
        when {
            featurePolygonsLatLng.isNotEmpty() -> {
                featurePolygonsLatLng.indices
                    .filter { featurePolygonsLatLng[it].size >= 2 }
                    .map { idx -> featurePolygonsClosed.getOrElse(idx) { featurePolygonsLatLng[idx].size >= 3 } }
            }
            polygonLatLngs.size >= 2 -> listOf(polygonLatLngs.size >= 3)
            else -> emptyList()
        }
    }

    val stateCode = remember(activeState) { IndianStateUnitsCatalog.getStateConfig(activeState).code }
    val stateJson = remember(
        baseLayer,
        overlayLayer,
        centerLat,
        centerLng,
        myLocation,
        effectiveFeatures,
        effectiveClosed,
        stateCode
    ) {
        buildMapStateJson(
            baseLayer = baseLayer,
            overlayLayer = overlayLayer,
            centerLat = centerLat,
            centerLng = centerLng,
            stateCode = stateCode,
            myLocation = myLocation,
            polygonLatLngs = effectiveFeatures.firstOrNull() ?: emptyList(),
            featurePolygonsLatLng = effectiveFeatures,
            featurePolygonsClosed = effectiveClosed
        )
    }

    LaunchedEffect(pageLoaded, stateJson) {
        val wv = webViewRef ?: return@LaunchedEffect
        if (pageLoaded) {
            val escaped = JSONObject.quote(stateJson)
            wv.evaluateJavascript("if (window.applyMapState) { window.applyMapState($escaped); }", null)
        }
    }

    LaunchedEffect(pageLoaded, isExpanded) {
        val wv = webViewRef ?: return@LaunchedEffect
        if (pageLoaded) {
            wv.evaluateJavascript("if (typeof map !== 'undefined' && map) { setTimeout(function(){ map.invalidateSize(); }, 180); }", null)
        }
    }

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier.fillMaxWidth().testTag(mapContainerTag)
    ) {
        Column(
            modifier = Modifier.padding(top = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Layers, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f)) {
                        Text(
                            title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            "${baseLayer.label} • $activeState (${GeoAndGpsUtils.toDms(centerLat, true)}, ${GeoAndGpsUtils.toDms(centerLng, false)})",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                FilledTonalIconButton(
                    onClick = { isExpanded = !isExpanded },
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("${mapContainerTag}_expand_button")
                ) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                        contentDescription = if (isExpanded) "Compact Map" else "Expand Map"
                    )
                }
            }

            if (allowGoogleLayers) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MapBaseLayer.entries.forEach { layer ->
                        FilterChip(
                            selected = baseLayer == layer,
                            onClick = { onSelectBaseLayer(layer) },
                            label = { Text(layer.label, style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.testTag("map_layer_${layer.id}")
                        )
                    }
                }
            }

            if (allowBhuvanOverlays) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    BhuvanOverlayLayer.entries.forEach { ov ->
                        FilterChip(
                            selected = overlayLayer == ov,
                            onClick = { onSelectOverlayLayer(ov) },
                            label = { Text(ov.label, style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.testTag("map_overlay_${ov.id}")
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(effectiveMapHeight)
            ) {
                if (!inPreview && !isRobolectric) {
                    val webViewInstance = remember(context) {
                        runCatching {
                            WebView(context).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                overScrollMode = WebView.OVER_SCROLL_NEVER
                                isVerticalScrollBarEnabled = false
                                isHorizontalScrollBarEnabled = false
                                setBackgroundColor(android.graphics.Color.parseColor("#1E293B"))
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.loadsImagesAutomatically = true
                                settings.blockNetworkImage = false
                                settings.useWideViewPort = true
                                settings.loadWithOverviewMode = true
                                settings.builtInZoomControls = true
                                settings.displayZoomControls = false
                                settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                                settings.cacheMode = WebSettings.LOAD_DEFAULT
                                settings.allowFileAccess = false
                                settings.allowContentAccess = false
                                settings.userAgentString =
                                    "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
                                setOnTouchListener { v, event ->
                                    if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_MOVE) {
                                        v.parent?.requestDisallowInterceptTouchEvent(true)
                                    }
                                    false
                                }
                                webChromeClient = WebChromeClient()
                                webViewClient = object : WebViewClient() {
                                    override fun shouldInterceptRequest(
                                        view: WebView?,
                                        request: WebResourceRequest?
                                    ): WebResourceResponse? {
                                        val path = request?.url?.path ?: return null
                                        return when {
                                            path.endsWith("/assets/leaflet/leaflet.js") -> runCatching {
                                                WebResourceResponse(
                                                    "application/javascript",
                                                    "UTF-8",
                                                    context.assets.open("leaflet/leaflet.js")
                                                )
                                            }.getOrNull()
                                            path.endsWith("/assets/leaflet/leaflet.css") -> runCatching {
                                                WebResourceResponse(
                                                    "text/css",
                                                    "UTF-8",
                                                    context.assets.open("leaflet/leaflet.css")
                                                )
                                            }.getOrNull()
                                            else -> null
                                        }
                                    }

                                    override fun shouldOverrideUrlLoading(
                                        view: WebView?,
                                        request: WebResourceRequest?
                                    ): Boolean = true

                                    override fun onPageFinished(view: WebView?, url: String?) {
                                        pageLoaded = true
                                    }
                                }
                                loadDataWithBaseURL(
                                    "https://sthalmeasure.app/",
                                    buildLeafletMapHtml(stateJson),
                                    "text/html",
                                    "UTF-8",
                                    null
                                )
                            }
                        }.getOrNull()
                    }
                    if (webViewInstance != null) {
                        DisposableEffect(webViewInstance) {
                            webViewRef = webViewInstance
                            onDispose {
                                if (webViewRef === webViewInstance) webViewRef = null
                                runCatching {
                                    webViewInstance.stopLoading()
                                    webViewInstance.destroy()
                                }
                            }
                        }
                        AndroidView(
                            factory = { webViewInstance },
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        FallbackVectorMapOverlay(
                            baseLayer = baseLayer,
                            overlayLayer = overlayLayer,
                            centerLat = centerLat,
                            centerLng = centerLng,
                            featurePolygonsLatLng = effectiveFeatures,
                            featurePolygonsClosed = effectiveClosed,
                            mapHeight = effectiveMapHeight
                        )
                    }
                } else {
                    FallbackVectorMapOverlay(
                        baseLayer = baseLayer,
                        overlayLayer = overlayLayer,
                        centerLat = centerLat,
                        centerLng = centerLng,
                        featurePolygonsLatLng = effectiveFeatures,
                        featurePolygonsClosed = effectiveClosed,
                        mapHeight = effectiveMapHeight
                    )
                }

                // My Location overlay button (always >= 48dp touch target)
                FilledTonalIconButton(
                    onClick = onMyLocationClick,
                    enabled = !locating,
                    colors = IconButtonDefaults.filledTonalIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                        contentColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .size(48.dp)
                        .testTag(myLocationButtonTag)
                ) {
                    if (locating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.MyLocation,
                            contentDescription = "My Location"
                        )
                    }
                }

                // Active layer pill at bottom-left of map canvas
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp)
                ) {
                    val overlayText = if (overlayLayer != BhuvanOverlayLayer.NONE) " + ${overlayLayer.label}" else ""
                    Text(
                        text = "${baseLayer.label}$overlayText • ${"%.5f".format(centerLat)}, ${"%.5f".format(centerLng)}",
                        style = MaterialTheme.typography.labelSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun FallbackVectorMapOverlay(
    baseLayer: MapBaseLayer,
    overlayLayer: BhuvanOverlayLayer,
    centerLat: Double,
    centerLng: Double,
    featurePolygonsLatLng: List<List<Pair<Double, Double>>>,
    featurePolygonsClosed: List<Boolean>,
    mapHeight: Dp
) {
    val plotFeatures = remember(featurePolygonsLatLng, centerLat, centerLng) {
        val firstPt = featurePolygonsLatLng.firstOrNull()?.firstOrNull()
        if (firstPt == null) {
            emptyList()
        } else {
            val oLat = firstPt.first
            val oLng = firstPt.second
            val mLat = 111132.954 - 559.822 * cos(2.0 * oLat * PI / 180.0)
            val mLng = (111412.84 * cos(oLat * PI / 180.0)).coerceAtLeast(1000.0)
            featurePolygonsLatLng.map { ring ->
                ring.mapIndexed { idx, (lat, lng) ->
                    PlotPoint((lng - oLng) * mLng, (lat - oLat) * mLat, "P${idx + 1}")
                }
            }
        }
    }
    Box(modifier = Modifier.fillMaxWidth().height(mapHeight)) {
        PlotCanvas(
            points = plotFeatures.firstOrNull() ?: emptyList(),
            multiFeatures = plotFeatures,
            multiFeaturesClosed = featurePolygonsClosed,
            canvasHeight = mapHeight,
            unitLabel = "m",
            emptyHint = "${baseLayer.label}${if (overlayLayer != BhuvanOverlayLayer.NONE) " + ${overlayLayer.label}" else ""}\nCenter: ${"%.5f".format(centerLat)}, ${"%.5f".format(centerLng)}"
        )
    }
}

private fun buildMapStateJson(
    baseLayer: MapBaseLayer,
    overlayLayer: BhuvanOverlayLayer,
    centerLat: Double,
    centerLng: Double,
    stateCode: String,
    myLocation: Pair<Double, Double>?,
    polygonLatLngs: List<Pair<Double, Double>>,
    featurePolygonsLatLng: List<List<Pair<Double, Double>>> = emptyList(),
    featurePolygonsClosed: List<Boolean> = emptyList()
): String {
    val root = JSONObject()
    root.put("baseLayer", baseLayer.id)
    val resolvedOverlay = when (overlayLayer) {
        BhuvanOverlayLayer.LULC_50K -> SurveyMapConfig.lulcLayerForStateCode(stateCode)
        else -> overlayLayer.wmsLayer
    }
    root.put("overlayWms", resolvedOverlay)
    root.put("overlayId", overlayLayer.id)
    root.put("stateCode", stateCode)
    root.put("lat", centerLat)
    root.put("lng", centerLng)
    if (myLocation != null) {
        root.put("myLat", myLocation.first)
        root.put("myLng", myLocation.second)
    }
    val polyArr = JSONArray()
    polygonLatLngs.forEach { (lat, lng) ->
        polyArr.put(JSONArray().apply {
            put(lat)
            put(lng)
        })
    }
    root.put("polygon", polyArr)

    val featsArr = JSONArray()
    val closedArr = JSONArray()
    var geomHash = 17
    featurePolygonsLatLng.forEachIndexed { idx, ring ->
        val ringArr = JSONArray()
        ring.forEach { (lat, lng) ->
            ringArr.put(JSONArray().apply {
                put(lat)
                put(lng)
            })
        }
        featsArr.put(ringArr)
        closedArr.put(featurePolygonsClosed.getOrElse(idx) { ring.size >= 3 })
        geomHash = 31 * geomHash + ring.size
        ring.firstOrNull()?.let { fp ->
            geomHash = 31 * geomHash + (fp.first * 100000).toInt()
            geomHash = 31 * geomHash + (fp.second * 100000).toInt()
        }
    }
    root.put("features", featsArr)
    root.put("featuresClosed", closedArr)
    root.put("geomHash", geomHash)
    return root.toString()
}

internal fun buildLeafletMapHtml(
    initialStateJson: String,
    leafletCss: String = "",
    leafletJs: String = ""
): String {
    val quotedInitial = JSONObject.quote(initialStateJson)
    val cssBlock = if (leafletCss.isNotBlank()) {
        "<style>\n$leafletCss\n</style>"
    } else {
        "<link rel=\"stylesheet\" href=\"https://sthalmeasure.app/assets/leaflet/leaflet.css\" />"
    }
    val jsBlock = if (leafletJs.isNotBlank()) {
        "<script>\n$leafletJs\n</script>"
    } else {
        "<script src=\"https://sthalmeasure.app/assets/leaflet/leaflet.js\"></script>"
    }
    return """
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          $cssBlock
          $jsBlock
          <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #1e293b; font-family: sans-serif; }
            .status-pill { position: absolute; top: 10px; left: 52px; z-index: 900; pointer-events: none; background: rgba(15,23,42,0.86); color: #f8fafc; font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.45); max-width: 66%; }
            .leaflet-cadastralPane-pane {
              filter: drop-shadow(0 0 1.2px rgba(255,255,255,0.96)) drop-shadow(0 0 2.6px rgba(255,255,255,0.92)) contrast(1.3) brightness(1.06);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="tileStatus" class="status-pill" style="display:none;"></div>
          <script>
            var state = JSON.parse($quotedInitial);
            var map = null;
            var activeBaseLayers = [];
            var currentBaseLayerId = null;
            var activeOverlay = null;
            var currentOverlayWms = null;
              var featureGroup = null;
              var myLocMarker = null;
              var myLocRing = null;
              var vertexLayer = null;
              var EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

              function buildBaseLayers(id, statusEl) {
                if (id === 'bhuvan_2d') {
                  var esriFallback = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    maxNativeZoom: 18,
                    maxZoom: 21,
                    zIndex: 90,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'Esri World Imagery'
                  });
                  var satBase = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    maxZoom: 21,
                    zIndex: 100,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'Satellite Imagery'
                  });
                  var bhuvanIndia3 = L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/india3@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    maxNativeZoom: 15,
                    maxZoom: 21,
                    opacity: 0.92,
                    zIndex: 200,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'ISRO NRSC Bhuvan Hybrid'
                  });
                  var bhuvanAdmin = L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/basemap:admin_group@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    maxNativeZoom: 14,
                    maxZoom: 21,
                    opacity: 0.88,
                    zIndex: 220,
                    errorTileUrl: EMPTY_TILE
                  });
                  satBase.on('loading', function() {
                    statusEl.textContent = 'Loading Bhuvan Hybrid satellite & NRSC tiles...';
                    statusEl.style.display = 'block';
                  });
                  satBase.on('load', function() {
                    statusEl.style.display = 'none';
                    updateCadastralZoomHint();
                  });
                  bhuvanIndia3.on('load', function() {
                    statusEl.style.display = 'none';
                    updateCadastralZoomHint();
                  });
                  return [esriFallback, satBase, bhuvanIndia3, bhuvanAdmin];
                }
                if (id === 'bhuvan_2d_map') {
                  var cartoBackdrop = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
                    maxNativeZoom: 19,
                    maxZoom: 20,
                    opacity: 0.65,
                    zIndex: 100,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'Carto Topo'
                  });
                  var classicIndia3 = L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/india3@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    maxNativeZoom: 15,
                    maxZoom: 20,
                    opacity: 0.95,
                    zIndex: 200,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'ISRO NRSC Bhuvan 2D'
                  });
                  var classicAdmin = L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/basemap:admin_group@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    maxNativeZoom: 14,
                    maxZoom: 20,
                    opacity: 0.88,
                    zIndex: 220,
                    errorTileUrl: EMPTY_TILE
                  });
                  classicIndia3.on('load', function() { statusEl.style.display = 'none'; });
                  return [cartoBackdrop, classicIndia3, classicAdmin];
                }
                if (id === 'google_streets') {
                  return [L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 21, errorTileUrl: EMPTY_TILE, attribution: 'Google Maps' })];
                }
                if (id === 'google_satellite') {
                  return [L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 21, errorTileUrl: EMPTY_TILE, attribution: 'Google Satellite' })];
                }
                return [L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 21, errorTileUrl: EMPTY_TILE, attribution: 'Google Hybrid' })];
              }

              function buildOverlayTileLayer(overlayWms) {
                if (!overlayWms || overlayWms.length === 0) return null;
                if (overlayWms.indexOf('lulc:') === 0) {
                  return L.tileLayer('${SurveyMapConfig.BHUVAN_VEC2_TMS_BASE}/' + overlayWms + '@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    maxNativeZoom: 15,
                    maxZoom: 21,
                    opacity: 0.72,
                    zIndex: 450,
                    errorTileUrl: EMPTY_TILE
                  });
                }
                if (overlayWms.indexOf('cadastral:') === 0) {
                  return L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/' + overlayWms + '@EPSG:900913@png/{z}/{x}/{y}.png', {
                    tms: true,
                    pane: 'cadastralPane',
                    maxNativeZoom: 18,
                    maxZoom: 21,
                    opacity: 1.0,
                    zIndex: 620,
                    errorTileUrl: EMPTY_TILE,
                    attribution: 'NRSC Cadastral Survey'
                  });
                }
                return L.tileLayer('${SurveyMapConfig.BHUVAN_VEC1_TMS_BASE}/' + overlayWms + '@EPSG:900913@png/{z}/{x}/{y}.png', {
                  tms: true,
                  maxNativeZoom: 18,
                  maxZoom: 21,
                  opacity: 0.90,
                  zIndex: 450,
                  errorTileUrl: EMPTY_TILE
                });
              }

              function isCadastralActive(ovWms, ovId) {
                return (ovWms && ovWms.indexOf('cadastral:') === 0) || ovId === 'CADASTRAL_OVERLAY';
              }

              function updateCadastralZoomHint() {
                if (!map) return;
                var statusEl = document.getElementById('tileStatus');
                if (!statusEl) return;
                if (isCadastralActive(currentOverlayWms, state.overlayId)) {
                  var z = map.getZoom();
                  if (z < 16) {
                    statusEl.textContent = 'Zoom in (17+) for cadastral parcels & survey numbers';
                    statusEl.style.display = 'block';
                    return;
                  } else if (z < 17) {
                    statusEl.textContent = 'Zoom in 1 step (17+) to reveal survey numbers';
                    statusEl.style.display = 'block';
                    return;
                  }
                }
                if (statusEl.textContent && statusEl.textContent.indexOf('Zoom in') === 0) {
                  statusEl.style.display = 'none';
                }
              }

              function initMap() {
                if (typeof L === 'undefined') {
                  var box = document.getElementById('map');
                  box.innerHTML = '<div style="padding:16px;color:#f8fafc;font-size:13px;">Interactive map tile engine initializing... Coordinates: ' +
                    state.lat.toFixed(5) + ', ' + state.lng.toFixed(5) + '</div>';
                  return;
                }
                var isCad = isCadastralActive(state.overlayWms, state.overlayId);
                var startZoom = isCad ? 17 : ((state.baseLayer === 'bhuvan_2d' || state.baseLayer === 'bhuvan_2d_map') ? 15 : 16);
                map = L.map('map', { zoomControl: true, attributionControl: false }).setView([state.lat, state.lng], startZoom);
                var cadPane = map.createPane('cadastralPane');
                cadPane.style.zIndex = 620;
                cadPane.style.pointerEvents = 'none';
                L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
                featureGroup = L.featureGroup().addTo(map);
                vertexLayer = L.layerGroup().addTo(map);
                map.on('zoomend', updateCadastralZoomHint);
                if (typeof ResizeObserver !== 'undefined') {
                  new ResizeObserver(function() {
                    if (map) { map.invalidateSize(); }
                  }).observe(document.getElementById('map'));
                }
                renderState(state, true);
              }

              function renderState(next, recenter) {
                if (!map) return;
                var statusEl = document.getElementById('tileStatus');
                if (currentBaseLayerId !== next.baseLayer) {
                  activeBaseLayers.forEach(function(lyr) { map.removeLayer(lyr); });
                  activeBaseLayers = [];
                  statusEl.style.display = 'none';
                  activeBaseLayers = buildBaseLayers(next.baseLayer, statusEl);
                  activeBaseLayers.forEach(function(lyr) { lyr.addTo(map); });
                  currentBaseLayerId = next.baseLayer;
                }

                var nextOvWms = next.overlayWms || '';
                var switchedToCadastral = currentOverlayWms !== nextOvWms && isCadastralActive(nextOvWms, next.overlayId);
                if (currentOverlayWms !== nextOvWms) {
                  if (activeOverlay) { map.removeLayer(activeOverlay); activeOverlay = null; }
                  activeOverlay = buildOverlayTileLayer(nextOvWms);
                  if (activeOverlay) {
                    activeOverlay.addTo(map);
                  }
                  currentOverlayWms = nextOvWms;
                }

                vertexLayer.clearLayers();
                featureGroup.clearLayers();
                var feats = (next.features && next.features.length > 0) ? next.features :
                  (next.polygon && next.polygon.length >= 2 ? [next.polygon] : []);
                var closedFlags = next.featuresClosed || [];
                var totalVerts = 0;
                feats.forEach(function(f) { totalVerts += (f ? f.length : 0); });
                var strokeWeight = totalVerts > 120 ? 2.2 : 3.2;

                feats.forEach(function(pts, fIdx) {
                  if (!pts || pts.length < 2) return;
                  var isClosed = closedFlags.length > fIdx ? closedFlags[fIdx] : (pts.length >= 3);
                  if (isClosed && pts.length >= 3) {
                    L.polygon(pts, { color: '#10b981', weight: strokeWeight, fillColor: '#14b8a6', fillOpacity: 0.22 }).addTo(featureGroup);
                  } else {
                    L.polyline(pts, { color: '#10b981', weight: strokeWeight }).addTo(featureGroup);
                  }
                });

                if (totalVerts > 0 && totalVerts <= 60) {
                  var pNum = 1;
                  feats.forEach(function(pts) {
                    if (!pts) return;
                    pts.forEach(function(pt) {
                      L.circleMarker(pt, { radius: 4.5, color: '#ffffff', weight: 1.8, fillColor: '#10b981', fillOpacity: 1 })
                        .bindTooltip('P' + pNum++)
                        .addTo(vertexLayer);
                    });
                  });
                }

                if (featureGroup.getLayers().length > 0) {
                  if (recenter) {
                    map.fitBounds(featureGroup.getBounds(), { padding: [18, 18], maxZoom: 19 });
                  }
                } else if (recenter) {
                  var cadActive = isCadastralActive(nextOvWms, next.overlayId);
                  var z = cadActive ? 17 : ((next.baseLayer === 'bhuvan_2d' || next.baseLayer === 'bhuvan_2d_map') ? 15 : 16);
                  map.setView([next.lat, next.lng], z);
                } else if (switchedToCadastral && map.getZoom() < 17) {
                  map.setZoom(17);
                }

                if (myLocMarker) { map.removeLayer(myLocMarker); myLocMarker = null; }
                if (myLocRing) { map.removeLayer(myLocRing); myLocRing = null; }
                if (typeof next.myLat === 'number' && typeof next.myLng === 'number') {
                  myLocRing = L.circleMarker([next.myLat, next.myLng], { radius: 13, color: '#60a5fa', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.24 }).addTo(map);
                  myLocMarker = L.circleMarker([next.myLat, next.myLng], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map);
                  if (recenter && featureGroup.getLayers().length === 0) {
                    map.setView([next.myLat, next.myLng], 17);
                  }
                }
                updateCadastralZoomHint();
              }

              window.applyMapState = function(rawJson) {
                var prevLat = state.lat;
                var prevLng = state.lng;
                var prevMyLat = state.myLat;
                var prevMyLng = state.myLng;
                var prevPolyLen = state.polygon ? state.polygon.length : 0;
                var prevGeomHash = state.geomHash || 0;
                state = JSON.parse(rawJson);
                var newPolyLen = state.polygon ? state.polygon.length : 0;
                var newGeomHash = state.geomHash || 0;
                var moved = Math.abs(prevLat - state.lat) > 1e-6 || Math.abs(prevLng - state.lng) > 1e-6 ||
                  prevMyLat !== state.myLat || prevMyLng !== state.myLng ||
                  prevPolyLen !== newPolyLen || prevGeomHash !== newGeomHash;
                renderState(state, moved);
              };

              initMap();
            </script>
          </body>
        </html>
    """.trimIndent()
}
