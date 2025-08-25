from dataclasses import dataclass
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class IDs(str, Enum):
    sport_image = "id-sport-image"
    map = "id-map"
    map_component = "id-map-component"
    location = "id-location"
    country = "id-country"
    button_country = "id-button-country"
    modal_country = "modal-select-country"
    modal_country_select = "modal-country-select-input"
    dropdown_location_value = "id-dropdown-location-value"
    dropdown_location = "id-dropdown-location"
    dropdown_sport = "id-dropdown-sport"
    btn_install = "id-button-install"


class Defaults(str, Enum):
    sport = "soccer"
    location = "North Sydney_NSW_2055_AU"
    country = "AU"


class UserSettings(BaseModel):
    location: Optional[str] = Defaults.location.value
    sport: Optional[str] = Defaults.sport.value

    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        setattr(self, key, value)


@dataclass()
class PostcodesDefault:
    MY: str = "Air Keroh_MLK_75450_MY"
    MA: str = "Aazanen_Oriental_62022_MA"
    PW: str = "Palau_PW_96940_PW"
    CX: str = "Territory of Christmas Island_CX_6798_CX"
    SI: str = "Adlešiči_SI_8341_SI"
    FI: str = "Aapajärvi_Lapland_98570_FI"
    AD: str = "Andorra la Vella_Andorra la Vella_AD500_AD"
    GG: str = "Alderney_GG_GY9_GG"
    TH: str = "Akat Amnuai_Sakon Nakhon_47170_TH"
    SE: str = "Abbekås_M_274 04_SE"
    RS: str = "Ada_RS_24430_RS"
    CL: str = "Algarrobo_Región de Valparaíso_2710000_CL"
    GS: str = "South Georgia and the South Sandwich Islands_GS_SIQQ 1ZZ_GS"
    EC: str = "10 De Agosto_Manabí_131007_EC"
    SG: str = "Abingdon Road_SG_499931_SG"
    RE: str = "Bras-Panon_RE_97412_RE"
    CZ: str = "Abertamy_Karlovarský kraj_362 35_CZ"
    GI: str = "Gibraltar_GI_GX11 1AA_GI"
    SK: str = "Abovce_BC_980 44_SK"
    AR: str = "13 de enero_San Luis_D-5741_AR"
    DO: str = "12 de Haina_DO_11116_DO"
    PM: str = "Miquelon_Miquelon-Langlade_97500_PM"
    CN: str = "Abag Banner_Inner Mongolia_26100_CN"
    TR: str = "100.Yil_Ankara_6530_TR"
    PA: str = "24 De Diciembre_Panama_7109_PA"
    MW: str = "Amidu_S_302103_MW"
    ID: str = "1 Ilir_ID_30117_ID"
    LU: str = "Abweiler_ES_L-3311_LU"
    MC: str = "Anse de Canton_Monaco_98000_MC"
    HR: str = "Ada_Osječko-Baranjska_31207_HR"
    MO: str = "Macau Special Administrative Region_MO_999078_MO"
    PE: str = "02 de Febrero_Piura_20000_PE"
    BD: str = "Abdullahpur_81_2371_BD"
    RU: str = "10 Лет Октября_Алтайский Край_659738_RU"
    AZ: str = "1 Sayli_Abşeron_AZ 0101_AZ"
    EE: str = "Aa_Ida-Viru maakond_43311_EE"
    GU: str = "Agana Heights_Gu_96919_GU"
    DK: str = "Aabenraa_South Denmark_6200_DK"
    CR: str = "Acapulco_Provincia de Puntarenas_60114_CR"
    FO: str = "Akrar_FO_927_FO"
    NU: str = "Niue_NU_9974_NU"
    MK: str = "Amzabegovo_MK_2227_MK"
    IT: str = "Abano Terme_Veneto_35031_IT"
    LI: str = "Balzers_Balzers_9496_LI"
    HN: str = "Catacamas_Olancho_16201_HN"
    LK: str = "Addalaichenai_Eastern Province_32350_LK"
    HT: str = "Abricots_Grande Anse_HT7120_HT"
    MQ: str = "Basse-Pointe_MQ_97218_MQ"
    NO: str = "Abelvær_Trøndelag_7950_NO"
    KR: str = "가곡면_충청북도_27008_KR"
    IN: str = "(Gandhinagar) Sector 16_Gujarat_382016_IN"
    ZA: str = "Aberdeen_ZA_6270_ZA"
    JP: str = "-18.20-22.24-26.32.287.300-Banchi)_Kyoto Fu_606-0068_JP"
    NC: str = "Bouloupari_Province Sud_98812_NC"
    PK: str = "Abazai_Khyber Pakhtunkhwa_24550_PK"
    WF: str = "Alo_Circonscription d'Alo_98610_WF"
    AT: str = "Aalfang_Niederösterreich_3860_AT"
    AX: str = "Brändö_Ålands skärgård_22920_AX"
    CH: str = "Aadorf_TG_8355_CH"
    DE: str = "-LABO- Landesamt für Bürger- und Ordnungsangelegenheiten_16_10958_DE"
    RO: str = "1 Decembrie_Vaslui_737026_RO"
    ES: str = "25 De Gener (Bloc)_CT_43518_ES"
    FM: str = "Chuuk_State of Chuuk_96942_FM"
    SM: str = "Acquaviva_SM_47892_SM"
    AL: str = "4 Rruget e Shijakut_Qarku i Durrësit_2018_AL"
    BR: str = "Abadia de Goiás_Goias_75345-000_BR"
    US: str = "Aaronsburg_PA_16820_US"
    CA: str = "Abbotsford East_BC_V3G_CA"
    PN: str = "Pitcairn_Henderson_Ducie and Oeno Islands_PN_PCRN 1ZZ_PN"
    CY: str = "Acheleia_Pafos_8503_CY"
    GF: str = "Apatou_GF_97317_GF"
    NR: str = "Nauru_NR_NRU68_NR"
    IS: str = "Akranesi_IS_300_IS"
    MX: str = "1 de Diciembre_Baja California_21260_MX"
    NF: str = "Territory of Norfolk Island_NF_2899_NF"
    LV: str = "Ababļeva_24_LV-4616_LV"
    MT: str = "Attard_Attard_ATD_MT"
    IE: str = "Arklow_L_Y14_IE"
    YT: str = "Acoua_Acoua_97630_YT"
    HK: str = "Hong Kong Special Administrative Region_HK_999077_HK"
    LT: str = "A.Čiapo vienk._Šiauliai County_85001_LT"
    PL: str = "Abisynia_Pomerania_83-440_PL"
    GP: str = "Anse-Bertrand_GP_97121_GP"
    BM: str = "City of Hamilton_Hamilton_HM 08_BM"
    AS: str = "Pago Pago_AS_96799_AS"
    FR: str = "Aast_Nouvelle-Aquitaine_64460_FR"
    CO: str = "Abejorral_Antioquia_55030_CO"
    BY: str = "Minsk_Minsk_220021_BY"
    DZ: str = "20 Logements Agricole_Mascara_29034_DZ"
    SJ: str = "Barentsburg_Svalbard_9178_SJ"
    PT: str = "4 Águas_Coimbra_3200-335_PT"
    IM: str = "Andreas_IM_IM7_IM"
    NL: str = "'s Gravenmoer_North Brabant_5109_NL"
    KE: str = "Adungosi_Busia_50413_KE"
    GL: str = "Aasiaat_GL_3950_GL"
    TC: str = "Turks and Caicos Islands_TC_TKCA 1ZZ_TC"
    UA: str = "1 Травня_Kyivska_9823_UA"
    UY: str = "18 De Julio_Rocha_27100_UY"
    BE: str = "'S Gravenwezel_VLG_2970_BE"
    PH: str = "1st Ave. to 7th Ave. - West_NCR_1405_PH"
    GT: str = "ACATENANGO_DEPTO DE CHIMALTENANGO_4011_GT"
    GB: str = "A'Chill_SCT_PH44_GB"
    WS: str = "Independent State of Samoa_WS_AS 96799_WS"
    PR: str = "Adjuntas_Adjuntas_601_PR"
    VI: str = "Christiansted_Vi_820_VI"
    PF: str = "Aakapa_Îles Marquises_98742_PF"
    BG: str = "Bov_SFO_2271_BG"
    HM: str = "Territory of Heard Island and McDonald Islands_HM_7151_HM"
    MP: str = "Rota_Rota_96951_MP"
    MD: str = "Abaclia_Cimislia_MD-6711_MD"
    NZ: str = "Ahaura_G3_7843_NZ"
    HU: str = "Aba_FE_8127_HU"
    MH: str = "Ebeye_Marshall Islands_96970_MH"
    JE: str = "Jersey_JE_JE4_JE"
    AU: str = Defaults.location.value

    def __getitem__(self, key):
        return getattr(self, key)


class DropDownInfo(BaseModel):
    id: str
    question: str
    options: list[dict]
    multi: bool
    default: str
