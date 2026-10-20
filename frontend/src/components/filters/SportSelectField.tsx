import { Box, Group, Select, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FILTER_FIELD_LABEL_WIDTH } from "@/components/filters/LocationSuggestField";
import { CONTENT_GAP } from "@/config/uiLayout";
import { isSportType, sports, type SportType } from "@/domain/sport";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SportSelectFieldProps {
  value: SportType;
  onChange: (sport: SportType) => void;
  disabled?: boolean;
  labelWidth?: number;
}

/**
 * Shared sport selector used by Home filters and the Dashboard add-card modal.
 */
export function SportSelectField({
  value,
  onChange,
  disabled = false,
  labelWidth = FILTER_FIELD_LABEL_WIDTH,
}: SportSelectFieldProps) {
  const { t } = useTranslation();
  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const handleSportChange = (nextValue: string | null) => {
    if (nextValue !== null && isSportType(nextValue)) {
      onChange(nextValue);
    }
  };

  return (
    <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
      <Text fw={600} w={labelWidth} ta="right">
        {t("home.sections.filters.sportLabel")}:
      </Text>
      <Box flex={1}>
        <Select
          aria-label={t("home.sections.filters.sportLabel")}
          size="md"
          data={sportOptions}
          value={value}
          onChange={handleSportChange}
          searchable
          nothingFoundMessage={t("home.sections.filters.sportNotFound")}
          disabled={disabled}
        />
      </Box>
    </Group>
  );
}
