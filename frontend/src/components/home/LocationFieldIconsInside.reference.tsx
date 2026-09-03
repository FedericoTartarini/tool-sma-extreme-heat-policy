import { Combobox, Group, Loader } from "@mantine/core";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";

const LOCATION_INPUT_RIGHT_SECTION_WIDTH = 118;

interface LocationFieldIconsInsideRightSectionProps {
  isSuggestLoading: boolean;
  isSaveDisabled: boolean;
  onSave: () => void;
}

/**
 * Previous Issue #51 layout: Use my location + Save lived inside the location
 * field (`InputBase` `rightSection`). This file is not imported by the app.
 *
 * Attach it (or a gist of it) in the PR so the inside-the-field layout can be
 * restored later without losing the code.
 *
 * Wire-up that was removed from FiltersSection:
 *   rightSection={locationRightSection}
 *   rightSectionWidth={LOCATION_INPUT_RIGHT_SECTION_WIDTH}
 *   rightSectionPointerEvents="all"
 */
export function LocationFieldIconsInsideRightSection({
  isSuggestLoading,
  isSaveDisabled,
  onSave,
}: LocationFieldIconsInsideRightSectionProps) {
  return (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      {isSuggestLoading ? <Loader size={16} /> : <Combobox.Chevron size="md" />}
      <LocationFieldActionIcons
        isSaveDisabled={isSaveDisabled}
        onSave={onSave}
      />
    </Group>
  );
}

export { LOCATION_INPUT_RIGHT_SECTION_WIDTH };
