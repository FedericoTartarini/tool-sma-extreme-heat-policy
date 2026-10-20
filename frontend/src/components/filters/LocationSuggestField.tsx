import {
  Box,
  Combobox,
  Group,
  InputBase,
  Loader,
  Text,
  useCombobox,
} from "@mantine/core";
import { type MouseEvent, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { LocationSuggestion } from "@/domain/location";

export const FILTER_FIELD_LABEL_WIDTH = 72;

export interface LocationSuggestFieldProps {
  value: string;
  suggestions: readonly LocationSuggestion[];
  isLoading?: boolean;
  disabled?: boolean;
  /** When true, the input shows a committed location label. */
  isCommitted?: boolean;
  /** Open the dropdown on every keystroke (Home). */
  openDropdownWhenTyping?: boolean;
  /** Select the full committed label on click (Home). */
  enableSelectOnCommittedClick?: boolean;
  /** Open when suggestions become available (Home suggest flow). */
  autoOpenWhenSuggestionsReady?: boolean;
  labelWidth?: number;
  onChange: (value: string) => void;
  onOptionSubmit: (suggestionId: string) => void;
}

/**
 * Shared location search field used by Home filters and the Dashboard add-card modal.
 */
export function LocationSuggestField({
  value,
  suggestions,
  isLoading = false,
  disabled = false,
  isCommitted = false,
  openDropdownWhenTyping = true,
  enableSelectOnCommittedClick = false,
  autoOpenWhenSuggestionsReady = false,
  labelWidth = FILTER_FIELD_LABEL_WIDTH,
  onChange,
  onOptionSubmit,
}: LocationSuggestFieldProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  const shouldRenderLocationDropdown = suggestions.length > 0;
  const locationRightSection = isLoading ? (
    <Loader size={16} />
  ) : (
    <Combobox.Chevron size="md" />
  );
  const locationOptions = suggestions.map((suggestion) => (
    <Combobox.Option value={suggestion.id} key={suggestion.id}>
      {suggestion.displayLabel}
    </Combobox.Option>
  ));

  useEffect(() => {
    if (autoOpenWhenSuggestionsReady && shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  }, [
    autoOpenWhenSuggestionsReady,
    locationCombobox,
    shouldRenderLocationDropdown,
  ]);

  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  const handleLocationInputClick = (event: MouseEvent<HTMLInputElement>) => {
    if (enableSelectOnCommittedClick && isCommitted) {
      event.currentTarget.select();
    }

    if (shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  };

  return (
    <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
      <Text fw={600} w={labelWidth} ta="right">
        {t("home.sections.filters.locationLabel")}:
      </Text>
      <Box flex={1}>
        <Combobox
          store={locationCombobox}
          onOptionSubmit={(optionValue) => {
            onOptionSubmit(optionValue);
            closeLocationDropdown();
          }}
          size="md"
        >
          <Combobox.Target targetType="input">
            <InputBase
              __staticSelector="Select"
              aria-label={t("home.sections.filters.locationLabel")}
              size="md"
              placeholder={t("home.sections.filters.locationPlaceholder")}
              value={value}
              onChange={(event) => {
                onChange(event.currentTarget.value);
                if (openDropdownWhenTyping) {
                  locationCombobox.openDropdown();
                }
              }}
              onFocus={() => {
                if (shouldRenderLocationDropdown) {
                  locationCombobox.openDropdown();
                }
              }}
              onBlur={closeLocationDropdown}
              onClick={
                enableSelectOnCommittedClick
                  ? handleLocationInputClick
                  : undefined
              }
              rightSection={locationRightSection}
              rightSectionPointerEvents="none"
              autoComplete="off"
              disabled={disabled}
            />
          </Combobox.Target>

          {shouldRenderLocationDropdown ? (
            <Combobox.Dropdown>
              <Combobox.Options>{locationOptions}</Combobox.Options>
            </Combobox.Dropdown>
          ) : null}
        </Combobox>
      </Box>
    </Group>
  );
}
