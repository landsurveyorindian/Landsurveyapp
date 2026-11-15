package com.sthalmeasure.app.domain

import kotlin.math.abs

enum class LinearUnit(
    val key: String,
    val label: String,
    val shortLabel: String,
    val toMetersFactor: Double
) {
    METERS("meters", "Meters (m)", "m", 1.0),
    FEET("feet", "Feet (ft)", "ft", 0.3048),
    YARDS("yards", "Yards / Gaj (yd)", "yd", 0.9144),
    GUNTER_CHAINS("gunter_chains", "Gunter's Chain (66 ft)", "ch", 20.1168),
    GUNTER_LINKS("gunter_links", "Gunter's Link (0.66 ft)", "lk", 0.201168),
    METRIC_LINKS("metric_links", "Metric Link (0.20 m)", "mlk", 0.20);

    fun toMeters(value: Double): Double = value * toMetersFactor
    fun fromMeters(meters: Double): Double = meters / toMetersFactor
}

data class AreaBreakdown(
    val sqm: Double,
    val sqft: Double,
    val sqYards: Double,
    val cents: Double,
    val guntas: Double,
    val acres: Double,
    val hectares: Double,
    val ares: Double
)

fun convertAreaFromSqm(sqm: Double): AreaBreakdown {
    val safe = sqm.coerceAtLeast(0.0)
    val sqft = safe / 0.09290304
    val sqYards = sqft / 9.0
    val cents = sqft / 435.6
    val guntas = sqft / 1089.0
    val acres = sqft / 43560.0
    val hectares = safe / 10000.0
    val ares = safe / 100.0
    return AreaBreakdown(
        sqm = safe,
        sqft = sqft,
        sqYards = sqYards,
        cents = cents,
        guntas = guntas,
        acres = acres,
        hectares = hectares,
        ares = ares
    )
}

enum class IndianRegion(val label: String) {
    NATIONAL("National"),
    NORTH("North"),
    SOUTH("South"),
    EAST("East"),
    WEST("West"),
    CENTRAL("Central"),
    NORTH_EAST("North-East"),
    UNION_TERRITORY("Union Territory")
}

data class StateCadastralUnit(
    val key: String,
    val name: String,
    val localName: String,
    val sqft: Double,
    val sqm: Double,
    val description: String,
    val category: String = "traditional"
)

data class IndianStateInfo(
    val state: String,
    val code: String,
    val region: IndianRegion,
    val revenuePortal: String,
    val primaryUnits: List<String>,
    val units: List<StateCadastralUnit>,
    val notes: String
)

data class ConvertedUnitValue(
    val unit: StateCadastralUnit,
    val value: Double,
    val formatted: String
)

object IndianStateUnitsCatalog {
    private const val SQFT_TO_SQM = 0.09290304

    private fun u(
        key: String,
        name: String,
        localName: String,
        sqft: Double,
        description: String,
        category: String = "traditional"
    ) = StateCadastralUnit(
        key = key,
        name = name,
        localName = localName,
        sqft = sqft,
        sqm = sqft * SQFT_TO_SQM,
        description = description,
        category = category
    )

    private val BASE_SQFT = u("sqft", "Square Feet", "वर्ग फुट", 1.0, "1 Sq. Ft = 0.0929 m²", "metric")
    private val BASE_SQYD = u("sqyd", "Square Yard (Gaj)", "वर्ग गज", 9.0, "1 Sq. Yd = 9 Sq. Ft = 0.8361 m²", "customary")
    private val BASE_SQM = StateCadastralUnit("sqm", "Square Meter (SI)", "वर्ग मीटर", 1.0 / SQFT_TO_SQM, 1.0, "Standard SI metric unit", "metric")
    private val BASE_CENT = u("cent", "Cent / Decimal", "सेंटी / डेसिमल", 435.6, "1 Cent = 1/100 Acre = 435.6 Sq. Ft = 40.468 m²", "customary")
    private val BASE_GUNTA = u("gunta", "Gunta / Guntha", "गुंठा", 1089.0, "1 Gunta = 1/40 Acre = 1089 Sq. Ft = 101.171 m²", "customary")
    private val BASE_ACRE = u("acre", "Acre", "एकड़", 43560.0, "1 Acre = 4840 Sq. Yds = 43,560 Sq. Ft = 4046.856 m²", "colonial")
    private val BASE_HECTARE = StateCadastralUnit("hectare", "Hectare", "हेक्टेयर", 10000.0 / SQFT_TO_SQM, 10000.0, "1 Hectare = 10,000 m² = 2.47105 Acres", "metric")
    private val BASE_ARE = StateCadastralUnit("are", "Are", "आर", 100.0 / SQFT_TO_SQM, 100.0, "1 Are = 100 m² = 1076.39 Sq. Ft", "metric")
    private val BASE_GROUND = u("ground", "Ground", "மனை (கிரவுண்ட்)", 2400.0, "1 Ground = 2400 Sq. Ft = 222.967 m²", "customary")

    val allStates: List<IndianStateInfo> = listOf(
        IndianStateInfo(
            state = "All-India",
            code = "IN",
            region = IndianRegion.NATIONAL,
            revenuePortal = "Survey of India / DILRMP",
            primaryUnits = listOf("Acres", "Hectares", "Cents", "Guntas", "Pucca Bigha", "Kanal", "Grounds", "Sq. Yards", "Sq. Feet", "Sq. Meters"),
            units = listOf(
                BASE_ACRE, BASE_HECTARE, BASE_CENT, BASE_GUNTA,
                u("bigha_pucca_std", "Bigha (Standard Pucca)", "पक्का बीघा", 27225.0, "3025 Sq. Yds = 27,225 Sq. Ft = 2529.29 m²"),
                u("bigha_bengal_std", "Bigha (East / Bengal / Assam)", "বিঘা", 14400.0, "1600 Sq. Yds = 14,400 Sq. Ft = 1337.80 m²"),
                u("kanal_std", "Kanal (North / PB / HR / JK)", "कनाल", 5445.0, "605 Sq. Yds = 5445 Sq. Ft = 505.86 m²"),
                u("marla_std", "Marla", "मरला", 272.25, "1/20 Kanal = 272.25 Sq. Ft = 25.29 m²"),
                BASE_GROUND, BASE_ARE, BASE_SQYD, BASE_SQFT, BASE_SQM
            ),
            notes = "Universal DILRMP standard unifying North, East, West, and South Indian revenue units."
        ),
        IndianStateInfo(
            state = "Andhra Pradesh",
            code = "AP",
            region = IndianRegion.SOUTH,
            revenuePortal = "Meebhoomi (Adangal & 1-B ROR)",
            primaryUnits = listOf("Acres", "Cents", "Guntas", "Ankanams", "Sq. Yards (Gajam)", "Sq. Feet"),
            units = listOf(
                BASE_ACRE, BASE_CENT, BASE_GUNTA,
                u("ankanam_ap", "Ankanam (Nellore / Rayalaseema)", "అంకణం", 72.0, "1 Ankanam = 72 Sq. Ft = 8 Sq. Yds"),
                u("ankanam_coastal", "Ankanam (Coastal / Tirupati)", "అంకణం (చిన్నది)", 36.0, "1 Coastal Ankanam = 36 Sq. Ft = 4 Sq. Yds"),
                u("gajam_ap", "Gajam (Sq. Yard)", "గజం", 9.0, "1 Gajam = 9 Sq. Ft = 0.8361 m²"),
                BASE_SQFT, BASE_HECTARE, BASE_SQM
            ),
            notes = "1 Acre = 100 Cents = 4840 Sq. Yards. Rayalaseema & Nellore widely use Ankanams."
        ),
        IndianStateInfo(
            state = "Telangana",
            code = "TG",
            region = IndianRegion.SOUTH,
            revenuePortal = "Dharani Portal (Pattadar Passbook & RoR)",
            primaryUnits = listOf("Acres", "Guntas", "Sq. Yards (Gajam)", "Sq. Feet", "Cents"),
            units = listOf(
                BASE_ACRE, BASE_GUNTA,
                u("guntadiv_tg", "Quarter Gunta", "పావు గుంట", 272.25, "1/4 Gunta = 272.25 Sq. Ft = 30.25 Sq. Yds"),
                u("gajam_tg", "Gajam (Sq. Yard)", "గజం", 9.0, "1 Gajam = 9 Sq. Ft"),
                BASE_CENT, BASE_SQFT, BASE_HECTARE, BASE_SQM
            ),
            notes = "Dharani records strictly standardize on 1 Acre = 40 Guntas; 1 Gunta = 121 Sq. Yds = 1089 Sq. Ft."
        ),
        IndianStateInfo(
            state = "Karnataka",
            code = "KA",
            region = IndianRegion.SOUTH,
            revenuePortal = "Bhoomi Karnataka (RTC / Pahani)",
            primaryUnits = listOf("Acres", "Guntas", "Aane", "Cents", "Sq. Feet"),
            units = listOf(
                BASE_ACRE, BASE_GUNTA,
                u("aane_ka", "Aane / Anna (1/16 Gunta)", "ಆಣೆ", 68.0625, "1 Gunta = 16 Aanes = 68.0625 Sq. Ft"),
                BASE_CENT, BASE_SQFT, BASE_SQYD, BASE_SQM, BASE_HECTARE
            ),
            notes = "Bhoomi RTC uses Acre-Gunta-Aane; coastal districts (Dakshina Kannada, Udupi) also use Cents."
        ),
        IndianStateInfo(
            state = "Tamil Nadu",
            code = "TN",
            region = IndianRegion.SOUTH,
            revenuePortal = "Tamil Nilam (Patta / Chitta / FMB)",
            primaryUnits = listOf("Grounds", "Cents", "Acres", "Kuzhi", "Kani", "Sq. Feet"),
            units = listOf(
                BASE_GROUND, BASE_CENT, BASE_ACRE,
                u("kuzhi_tn", "Kuzhi", "குழி", 144.0, "1 Kuzhi = 144 Sq. Ft = 13.378 m²"),
                u("kani_tn", "Kani", "காணி", 57499.2, "1 Kani = 1.32 Acres = 24 Grounds"),
                BASE_SQFT, BASE_SQYD, BASE_HECTARE, BASE_SQM
            ),
            notes = "Urban Chennai transacts in Grounds (2400 sq ft); rural FMB/Patta uses Hectare-Are & Acres-Cents."
        ),
        IndianStateInfo(
            state = "Kerala",
            code = "KL",
            region = IndianRegion.SOUTH,
            revenuePortal = "e-Rekha / Bhoomi Kerala",
            primaryUnits = listOf("Cents", "Ares", "Acres", "Hectares", "Perch", "Sq. Feet"),
            units = listOf(
                BASE_CENT, BASE_ARE, BASE_ACRE, BASE_HECTARE,
                u("perch_kl", "Perch", "പെർച്ച്", 272.25, "1 Perch = 272.25 Sq. Ft"),
                BASE_SQFT, BASE_SQM
            ),
            notes = "e-Rekha records in Hectare-Are-Sq. Meter; property transactions priced per Cent (435.6 sq ft)."
        ),
        IndianStateInfo(
            state = "Maharashtra",
            code = "MH",
            region = IndianRegion.WEST,
            revenuePortal = "Mahabhulekh (7/12 & 8A)",
            primaryUnits = listOf("Gunta / Guntha", "Acres", "Hectares", "Ares", "Sq. Meters", "Sq. Feet"),
            units = listOf(
                BASE_GUNTA, BASE_ACRE, BASE_ARE, BASE_HECTARE,
                u("bigha_mh", "Maharashtra Bigha", "बीघा", 27225.0, "1 Bigha = 25 Guntas = 27,225 Sq. Ft"),
                BASE_SQM, BASE_SQFT, BASE_SQYD
            ),
            notes = "7/12 extracts record Hectare-Are-Sq.Meter; rural transactions commonly quote in Gunta (1089 sq ft)."
        ),
        IndianStateInfo(
            state = "Gujarat",
            code = "GJ",
            region = IndianRegion.WEST,
            revenuePortal = "AnyRoR Gujarat (7/12 & 8A)",
            primaryUnits = listOf("Bigha (Gujarat)", "Vassa", "Gunta", "Vaar (Sq. Yd)", "Acres"),
            units = listOf(
                u("bigha_gujarat", "Gujarat Bigha (Standard)", "વીઘા", 17424.0, "1 Bigha = 16 Vassa = 17,424 Sq. Ft = 0.40 Acre"),
                u("vassa_gujarat", "Vassa", "વસો", 1089.0, "1 Bigha = 16 Vassa; 1 Vassa = 1089 Sq. Ft = 1 Gunta"),
                u("bigha_kacha_gj", "Kacha Bigha (Saurashtra)", "કાચું વીઘું", 12100.0, "Saurashtra/Kutch: 12,100 Sq. Ft"),
                u("vaar_gj", "Vaar (Square Yard)", "વાર", 9.0, "1 Vaar = 9 Sq. Ft"),
                BASE_GUNTA, BASE_ACRE, BASE_HECTARE, BASE_SQM, BASE_SQFT
            ),
            notes = "AnyRoR cadastre: 1 Acre = 2.5 Standard Bighas = 40 Vassa/Guntas."
        ),
        IndianStateInfo(
            state = "Goa",
            code = "GA",
            region = IndianRegion.WEST,
            revenuePortal = "DSLR Goa / Dharani Goa",
            primaryUnits = listOf("Sq. Meters", "Hectares", "Ares", "Guntas", "Cents"),
            units = listOf(BASE_SQM, BASE_ARE, BASE_HECTARE, BASE_GUNTA, BASE_CENT, BASE_ACRE, BASE_SQFT),
            notes = "Cadastral records maintained natively in Metric Square Meters, Ares, and Hectares."
        ),
        IndianStateInfo(
            state = "Uttar Pradesh",
            code = "UP",
            region = IndianRegion.NORTH,
            revenuePortal = "Bhulekh UP",
            primaryUnits = listOf("Pucca Bigha", "Kacha Bigha", "Biswa", "Biswansi", "Hectares", "Acres"),
            units = listOf(
                u("bigha_pucca_up", "Pucca Bigha (UP)", "पक्का बीघा", 27225.0, "1 Pucca Bigha = 20 Biswa = 27,225 Sq. Ft"),
                u("bigha_kacha_up", "Kacha Bigha", "कच्चा बीघा", 9075.0, "1/3 Pucca Bigha = 9,075 Sq. Ft"),
                u("biswa_up", "Biswa", "बिस्वा", 1361.25, "1/20 Bigha = 1361.25 Sq. Ft"),
                u("biswansi_up", "Biswansi", "बिस्वांसी", 68.0625, "1/20 Biswa = 68.0625 Sq. Ft"),
                BASE_HECTARE, BASE_ACRE, BASE_SQYD, BASE_SQFT
            ),
            notes = "Official registration in Hectares & Pucca Bigha (1 Acre = 1.6 Pucca Bighas)."
        ),
        IndianStateInfo(
            state = "Punjab",
            code = "PB",
            region = IndianRegion.NORTH,
            revenuePortal = "PLRS / Jamabandi Punjab",
            primaryUnits = listOf("Kanal", "Marla", "Sarsahi", "Acres", "Sq. Yards (Gaj)"),
            units = listOf(
                BASE_ACRE,
                u("kanal", "Kanal", "ਕਨਾਲ", 5445.0, "1 Acre = 8 Kanals; 1 Kanal = 5445 Sq. Ft = 605 Sq. Yds"),
                u("marla", "Marla", "ਮਰਲਾ", 272.25, "1 Kanal = 20 Marlas = 272.25 Sq. Ft"),
                u("sarsahi", "Sarsahi / Karam²", "ਸਰਸਾਹੀ", 30.25, "1 Marla = 9 Sarsahi = 30.25 Sq. Ft"),
                u("bigha_punjab", "Punjab Bigha (Pucca)", "ਬੀਘਾ", 21780.0, "1 Bigha = 4 Kanals = 21,780 Sq. Ft"),
                BASE_SQYD, BASE_SQFT, BASE_HECTARE
            ),
            notes = "Gunter Chain & Karam system: 1 Acre = 8 Kanals = 160 Marlas = 1,440 Sarsahis."
        ),
        IndianStateInfo(
            state = "Haryana",
            code = "HR",
            region = IndianRegion.NORTH,
            revenuePortal = "Jamabandi Haryana / HALRIS",
            primaryUnits = listOf("Kanal", "Marla", "Biswa", "Acres", "Sq. Yards (Gaj)"),
            units = listOf(
                BASE_ACRE,
                u("kanal_hr", "Kanal", "कनाल", 5445.0, "1 Acre = 8 Kanals = 5445 Sq. Ft"),
                u("marla_hr", "Marla", "मरला", 272.25, "1 Kanal = 20 Marlas = 272.25 Sq. Ft"),
                u("bigha_haryana", "Haryana Bigha", "बीघा", 27225.0, "5 Kanals = 27,225 Sq. Ft"),
                u("biswa_haryana", "Biswa", "बिस्वा", 1361.25, "1/20 Bigha = 1361.25 Sq. Ft"),
                BASE_SQYD, BASE_SQFT, BASE_HECTARE
            ),
            notes = "North Haryana uses Kanal-Marla; southern districts also use Bigha-Biswa."
        ),
        IndianStateInfo(
            state = "Rajasthan",
            code = "RJ",
            region = IndianRegion.NORTH,
            revenuePortal = "Apna Khata / E-Dharti",
            primaryUnits = listOf("Pucca Bigha", "Kacha Bigha", "Biswa", "Hectares", "Acres"),
            units = listOf(
                u("bigha_pucca_rj", "Pucca Bigha (Rajasthan)", "पक्का बीघा", 27225.0, "1 Pucca Bigha = 27,225 Sq. Ft"),
                u("bigha_kacha_rj", "Kacha Bigha (Rajasthan)", "कच्चा बीघा", 17424.0, "1 Kacha Bigha = 17,424 Sq. Ft = 0.40 Acre"),
                u("biswa_rj", "Biswa", "बिस्वा", 1361.25, "1/20 Pucca Bigha = 1361.25 Sq. Ft"),
                BASE_HECTARE, BASE_ACRE, BASE_SQYD, BASE_SQFT
            ),
            notes = "1 Hectare = 3.9536 Pucca Bighas; 1 Acre = 1.6 Pucca Bighas."
        ),
        IndianStateInfo(
            state = "Uttarakhand",
            code = "UK",
            region = IndianRegion.NORTH,
            revenuePortal = "Bhulekh Uttarakhand / Devbhoomi",
            primaryUnits = listOf("Nali", "Mutthi", "Hill Bigha", "Acres", "Hectares"),
            units = listOf(
                u("nali", "Nali", "नाली", 2160.0, "1 Nali = 240 Sq. Yds = 2160 Sq. Ft = 16 Mutthi"),
                u("mutthi", "Mutthi", "मुट्ठी", 135.0, "1/16 Nali = 135 Sq. Ft"),
                u("bigha_uk", "Uttarakhand Bigha", "बीघा", 6804.0, "3.15 Nali = 6804 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQYD, BASE_SQFT
            ),
            notes = "Kumaon & Garhwal hill settlements use Nali-Mutthi (1 Acre = 20.166 Nalis)."
        ),
        IndianStateInfo(
            state = "Himachal Pradesh",
            code = "HP",
            region = IndianRegion.NORTH,
            revenuePortal = "Himbhoomi",
            primaryUnits = listOf("Bigha (HP)", "Biswa (HP)", "Kanal", "Marla", "Acres"),
            units = listOf(
                u("bigha_hp", "Himachal Bigha", "बीघा", 8712.0, "1 Bigha = 8712 Sq. Ft = 0.20 Acre (5 Bighas = 1 Acre)"),
                u("biswa_hp", "Himachal Biswa", "बिस्वा", 435.6, "1/20 HP Bigha = 435.6 Sq. Ft = 1 Cent"),
                u("kanal_hp", "Kanal (Kangra)", "कनाल", 5445.0, "5445 Sq. Ft"),
                u("marla_hp", "Marla (Kangra)", "मरला", 272.25, "272.25 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "1 Acre = 5 Himachal Bighas = 100 Himachal Biswas."
        ),
        IndianStateInfo(
            state = "Bihar",
            code = "BR",
            region = IndianRegion.EAST,
            revenuePortal = "Biharbhumi",
            primaryUnits = listOf("Bigha", "Kattha", "Dhur", "Decimal", "Acres"),
            units = listOf(
                u("bigha_bihar", "Bihar Bigha", "बीघा", 27225.0, "20 Kattha = 27,225 Sq. Ft"),
                u("kattha_bihar", "Kattha / Katha", "कट्ठा", 1361.25, "20 Dhur = 1361.25 Sq. Ft"),
                u("dhur_bihar", "Dhur", "धूर", 68.0625, "68.0625 Sq. Ft"),
                u("decimal_bihar", "Decimal / Dismil", "डिसमिल", 435.6, "1/100 Acre = 435.6 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQYD, BASE_SQFT
            ),
            notes = "Standardized Bihar cadastre: 1 Acre = 1.6 Bighas = 32 Katthas = 100 Decimals."
        ),
        IndianStateInfo(
            state = "Jharkhand",
            code = "JH",
            region = IndianRegion.EAST,
            revenuePortal = "Jharbhoomi",
            primaryUnits = listOf("Bigha", "Kattha", "Dismil", "Acres", "Hectares"),
            units = listOf(
                u("bigha_jh", "Jharkhand Bigha", "बीघा", 27225.0, "27,225 Sq. Ft"),
                u("kattha_jh", "Kattha", "कट्ठा", 1361.25, "1361.25 Sq. Ft"),
                u("dismil_jh", "Dismil / Decimal", "डिसमिल", 435.6, "435.6 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "CNT & SPT acts predominantly record land in Acres and Dismils."
        ),
        IndianStateInfo(
            state = "West Bengal",
            code = "WB",
            region = IndianRegion.EAST,
            revenuePortal = "Banglarbhumi",
            primaryUnits = listOf("Bigha (Bengal)", "Cottah (Katha)", "Chhatak", "Satak", "Acres"),
            units = listOf(
                u("bigha_wb", "Bengal Bigha", "বিঘা", 14400.0, "20 Cottahs = 14,400 Sq. Ft (1 Acre = 3.025 Bighas)"),
                u("cottah_wb", "Cottah / Katha", "কাঠা", 720.0, "16 Chhataks = 720 Sq. Ft"),
                u("chhatak_wb", "Chhatak", "ছটাক", 45.0, "1 Chhatak = 45 Sq. Ft"),
                u("satak_wb", "Satak / Decimal", "শতক", 435.6, "1/100 Acre = 435.6 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQYD, BASE_SQFT
            ),
            notes = "1 Bengal Bigha = 20 Cottahs; 1 Cottah = 720 Sq. Ft = 16 Chhataks."
        ),
        IndianStateInfo(
            state = "Odisha",
            code = "OD",
            region = IndianRegion.EAST,
            revenuePortal = "Bhulekh Odisha",
            primaryUnits = listOf("Guntha (Odisha)", "Maana", "Bigha", "Acres", "Hectares"),
            units = listOf(
                u("guntha_odisha", "Guntha (Odisha)", "ଗୁଣ୍ଠ", 435.6, "In Odisha: 1 Guntha = 1 Decimal = 435.6 Sq. Ft"),
                u("maana_odisha", "Maana", "ମାଣ", 10890.0, "25 Gunthas = 0.25 Acre = 10,890 Sq. Ft"),
                u("bigha_odisha", "Odisha Bigha", "ବିଘା", 27225.0, "2.5 Maana = 27,225 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "Odisha cadastre uses Guntha (435.6 sq ft) & Maana (0.25 Acre). 4 Maanas = 1 Acre."
        ),
        IndianStateInfo(
            state = "Madhya Pradesh",
            code = "MP",
            region = IndianRegion.CENTRAL,
            revenuePortal = "MP Bhulekh",
            primaryUnits = listOf("Standard Pucca Bigha", "Gwalior Bigha", "Malwa Bigha", "Biswa", "Hectares"),
            units = listOf(
                u("bigha_pucca_mp", "Standard Pucca Bigha", "पक्का बीघा", 27225.0, "27,225 Sq. Ft"),
                u("bigha_gwalior_mp", "Gwalior Bigha", "ग्वालियर बीघा", 20000.0, "20,000 Sq. Ft"),
                u("bigha_malwa_mp", "Malwa Bigha", "मालवा बीघा", 17424.0, "17,424 Sq. Ft"),
                u("biswa_mp", "Biswa", "बिस्वा", 1361.25, "1361.25 Sq. Ft"),
                BASE_HECTARE, BASE_ACRE, BASE_SQFT
            ),
            notes = "MPLRC records agricultural holdings in Hectares; rural conveyancing uses Bigha & Biswa."
        ),
        IndianStateInfo(
            state = "Chhattisgarh",
            code = "CG",
            region = IndianRegion.CENTRAL,
            revenuePortal = "Bhuiyan CG",
            primaryUnits = listOf("Dismil / Decimal", "Bigha", "Kattha", "Acres", "Hectares"),
            units = listOf(
                u("dismil_cg", "Dismil / Decimal", "डिसमिल", 435.6, "435.6 Sq. Ft"),
                u("bigha_cg", "Bigha", "बीघा", 27225.0, "27,225 Sq. Ft"),
                u("kattha_cg", "Kattha", "कट्ठा", 1361.25, "1361.25 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "Bhuiyan portal maintains Khasra areas in Hectares and Dismils."
        ),
        IndianStateInfo(
            state = "Assam",
            code = "AS",
            region = IndianRegion.NORTH_EAST,
            revenuePortal = "Dharitree Assam",
            primaryUnits = listOf("Bigha (Assam)", "Katha", "Lessa", "Pura", "Acres"),
            units = listOf(
                u("bigha_assam", "Assam Bigha", "বিঘা", 14400.0, "5 Kathas = 14,400 Sq. Ft"),
                u("katha_assam", "Assam Katha", "কঠা", 2880.0, "20 Lessas = 2,880 Sq. Ft"),
                u("lessa_assam", "Lessa", "লেচা", 144.0, "144 Sq. Ft"),
                u("pura_assam", "Pura", "পুৰা", 57600.0, "4 Bighas = 57,600 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "1 Assam Bigha = 5 Kathas = 100 Lessas."
        ),
        IndianStateInfo(
            state = "Tripura",
            code = "TR",
            region = IndianRegion.NORTH_EAST,
            revenuePortal = "Jami Tripura",
            primaryUnits = listOf("Kani", "Ganda", "Kara", "Dron", "Acres"),
            units = listOf(
                u("kani_tripura", "Kani", "কানি", 17424.0, "20 Gandas = 17,424 Sq. Ft = 0.40 Acre"),
                u("ganda_tripura", "Ganda", "গণ্ডা", 871.2, "4 Karas = 871.2 Sq. Ft"),
                u("kara_tripura", "Kara", "কড়া", 217.8, "217.8 Sq. Ft"),
                u("dron_tripura", "Dron", "দ্রোণ", 278784.0, "16 Kanis = 6.40 Acres"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "1 Dron = 16 Kanis; 1 Kani = 20 Gandas = 0.40 Acre."
        ),
        IndianStateInfo(
            state = "Manipur",
            code = "MN",
            region = IndianRegion.NORTH_EAST,
            revenuePortal = "Loucha Pathap",
            primaryUnits = listOf("Pari", "Sangam", "Loushal", "Acres", "Hectares"),
            units = listOf(
                u("pari_manipur", "Pari", "পাৰী", 43560.0, "1 Pari = 1 Acre = 4 Sangam"),
                u("sangam_manipur", "Sangam", "চাংগম", 10890.0, "0.25 Acre = 10,890 Sq. Ft"),
                u("loushal_manipur", "Loushal", "লৌশল", 2722.5, "1/4 Sangam = 2722.5 Sq. Ft"),
                BASE_ACRE, BASE_HECTARE, BASE_SQFT
            ),
            notes = "Valley cadastre divides 1 Pari (Acre) into 4 Sangams and 16 Loushals."
        ),
        IndianStateInfo("Meghalaya", "ML", IndianRegion.NORTH_EAST, "Meghalaya Revenue", listOf("Bigha", "Katha", "Acres", "Hectares"), listOf(u("bigha_ml", "Bigha", "Bigha", 14400.0, "14,400 Sq. Ft"), u("katha_ml", "Katha", "Katha", 2880.0, "2,880 Sq. Ft"), BASE_ACRE, BASE_HECTARE, BASE_SQFT, BASE_SQM), "Autonomous District Councils maintain customary records alongside Acres/Hectares."),
        IndianStateInfo("Mizoram", "MZ", IndianRegion.NORTH_EAST, "Land Revenue Mizoram", listOf("Tin Land", "Bigha", "Acres", "Hectares"), listOf(u("tin_land", "Tin Land", "Tin Hmun", 43560.0, "~1 Acre = 43,560 Sq. Ft"), u("bigha_mz", "Bigha", "Bigha", 14400.0, "14,400 Sq. Ft"), BASE_ACRE, BASE_HECTARE, BASE_SQFT), "Periodic Patta & Land Settlement Certificates recorded in Hectares and Acres."),
        IndianStateInfo("Nagaland", "NL", IndianRegion.NORTH_EAST, "Nagaland Land Records", listOf("Acres", "Hectares", "Sq. Feet", "Sq. Meters"), listOf(BASE_ACRE, BASE_HECTARE, BASE_SQFT, BASE_SQM), "Urban surveys and official cadastre record in Acres and Hectares."),
        IndianStateInfo("Arunachal Pradesh", "AR", IndianRegion.NORTH_EAST, "Directorate of Land Management", listOf("Acres", "Hectares", "Bigha", "Sq. Meters"), listOf(BASE_ACRE, BASE_HECTARE, u("bigha_ar", "Bigha", "बीघा", 14400.0, "14,400 Sq. Ft"), BASE_SQM, BASE_SQFT), "Land Possession Certificates issued in Hectares, Acres, and Square Meters."),
        IndianStateInfo("Sikkim", "SK", IndianRegion.NORTH_EAST, "Land Revenue Sikkim", listOf("Bigha", "Kattha", "Acres", "Hectares"), listOf(u("bigha_sk", "Bigha", "बीघा", 14400.0, "14,400 Sq. Ft"), u("kattha_sk", "Kattha", "कट्ठा", 2880.0, "2,880 Sq. Ft"), BASE_ACRE, BASE_HECTARE, BASE_SQFT), "1 Acre = 3.025 Bighas."),
        IndianStateInfo("Delhi (NCT)", "DL", IndianRegion.UNION_TERRITORY, "Delhi Revenue Bhulekh", listOf("Sq. Yards (Gaj)", "Pucca Bigha", "Biswa", "Sq. Meters", "Acres"), listOf(u("gaj_dl", "Gaj (Sq. Yard)", "गज", 9.0, "9 Sq. Ft"), u("bigha_dl", "Pucca Bigha", "पक्का बीघा", 27225.0, "27,225 Sq. Ft"), u("biswa_dl", "Biswa", "बिस्वा", 1361.25, "1361.25 Sq. Ft"), BASE_ACRE, BASE_SQM, BASE_SQFT), "Urban plots transacted in Gaj (Sq. Yards) & Sq. Meters."),
        IndianStateInfo("Jammu and Kashmir", "JK", IndianRegion.UNION_TERRITORY, "Aapki Zameen Aapki Nigrani", listOf("Kanal", "Marla", "Sarsahi", "Acres"), listOf(BASE_ACRE, u("kanal_jk", "Kanal", "कनाल", 5445.0, "5445 Sq. Ft"), u("marla_jk", "Marla", "मरला", 272.25, "272.25 Sq. Ft"), u("sarsahi_jk", "Sarsahi", "सरसाही", 30.25, "30.25 Sq. Ft"), BASE_SQFT, BASE_HECTARE), "1 Acre = 8 Kanals = 160 Marlas."),
        IndianStateInfo("Ladakh", "LA", IndianRegion.UNION_TERRITORY, "Ladakh Revenue", listOf("Kanal", "Marla", "Khal", "Acres"), listOf(BASE_ACRE, u("kanal_la", "Kanal", "Kanal", 5445.0, "5445 Sq. Ft"), u("marla_la", "Marla", "Marla", 272.25, "272.25 Sq. Ft"), u("khal_la", "Khal", "Khal", 2722.5, "0.5 Kanal"), BASE_SQFT, BASE_HECTARE), "Leh & Kargil use Kanal-Marla alongside traditional Khal."),
        IndianStateInfo("Chandigarh", "CH", IndianRegion.UNION_TERRITORY, "Chandigarh Land Records", listOf("Kanal", "Marla", "Sq. Yards (Gaj)", "Acres"), listOf(u("kanal_ch", "Kanal", "कनाल", 5445.0, "5445 Sq. Ft"), u("marla_ch", "Marla", "मरला", 272.25, "272.25 Sq. Ft"), BASE_SQYD, BASE_ACRE, BASE_SQFT), "Planned sectors classified by Kanal & Marla plot sizes."),
        IndianStateInfo("Puducherry", "PY", IndianRegion.UNION_TERRITORY, "Nilamagal Puducherry", listOf("Kuzhi", "Kani", "Cents", "Grounds", "Acres"), listOf(u("kuzhi_py", "Kuzhi", "குழி", 144.0, "144 Sq. Ft"), u("kani_py", "Kani", "காணி", 57499.2, "1.32 Acres"), BASE_GROUND, BASE_CENT, BASE_ACRE, BASE_HECTARE), "French colonial cadastre blended with Tamil Kuzhi/Kani & Cents."),
        IndianStateInfo("Andaman and Nicobar Islands", "AN", IndianRegion.UNION_TERRITORY, "Andaman Revenue", listOf("Hectares", "Ares", "Acres", "Cents"), listOf(BASE_HECTARE, BASE_ARE, BASE_ACRE, BASE_CENT, BASE_SQM, BASE_SQFT), "Metric Hectares/Ares alongside Acres/Cents."),
        IndianStateInfo("Dadra and Nagar Haveli and Daman and Diu", "DN", IndianRegion.UNION_TERRITORY, "e-Land Records", listOf("Guntas", "Vassa", "Bigha", "Acres", "Hectares"), listOf(BASE_GUNTA, u("vassa_dn", "Vassa", "વસો", 1089.0, "1089 Sq. Ft"), u("bigha_dn", "Bigha", "વીઘા", 17424.0, "17,424 Sq. Ft"), BASE_ACRE, BASE_HECTARE, BASE_SQFT), "Shares western coastal Guntas, Vassa & Bigha."),
        IndianStateInfo("Lakshadweep", "LD", IndianRegion.UNION_TERRITORY, "Lakshadweep Land Records", listOf("Cents", "Ares", "Acres", "Hectares"), listOf(BASE_CENT, BASE_ARE, BASE_ACRE, BASE_HECTARE, BASE_SQM, BASE_SQFT), "Surveyed in Cents and Metric Ares/Hectares.")
    )

    fun getStateConfig(stateName: String): IndianStateInfo {
        val exact = allStates.firstOrNull { it.state.equals(stateName.trim(), ignoreCase = true) }
        if (exact != null) return exact
        val lower = stateName.trim().lowercase()
        return allStates.firstOrNull {
            it.code.lowercase() == lower || lower.contains(it.state.lowercase())
        } ?: allStates.first()
    }

    fun convertStateUnitToSqm(value: Double, unitKey: String, stateName: String? = null): Double {
        if (!value.isFinite() || value <= 0.0) return 0.0
        if (!stateName.isNullOrBlank()) {
            val match = getStateConfig(stateName).units.firstOrNull { it.key == unitKey }
            if (match != null) return value * match.sqm
        }
        val anyMatch = allStates.asSequence().flatMap { it.units.asSequence() }.firstOrNull { it.key == unitKey }
        return if (anyMatch != null) value * anyMatch.sqm else value
    }

    fun convertSqmToStateUnits(sqm: Double, stateName: String): List<ConvertedUnitValue> {
        val safeSqm = sqm.coerceAtLeast(0.0)
        return getStateConfig(stateName).units.map { unit ->
            val raw = safeSqm / unit.sqm
            val formatted = when {
                raw >= 1000.0 -> String.format("%,.2f", raw)
                raw >= 1.0 -> String.format("%.3f", raw).trimEnd('0').trimEnd('.')
                else -> String.format("%.4f", raw)
            }
            ConvertedUnitValue(unit = unit, value = raw, formatted = formatted)
        }
    }

    fun formatValue(value: Double, decimals: Int = 2): String {
        if (!value.isFinite()) return "0"
        val clean = if (abs(value) < 1e-9) 0.0 else value
        return String.format("%.${decimals}f", clean)
    }
}
