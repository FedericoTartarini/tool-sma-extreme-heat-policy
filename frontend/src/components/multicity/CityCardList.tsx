import { SimpleGrid, Stack } from "@mantine/core";
import { CityCard } from "@/components/multicity/CityCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { SavedLocation } from "@/domain/multicity";
import type { MulticityCityCardState } from "@/domain/multicityBatch";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useMulticityStore } from "@/store/multicityStore";

interface CityCardListProps {
  locations: SavedLocation[];
  getCardState: (location: SavedLocation) => MulticityCityCardState;
}

/**
 * Renders saved city cards in a responsive grid or vertical list.
 */
export function CityCardList({ locations, getCardState }: CityCardListProps) {
  const isMobile = useIsMobileViewport();
  const sport = useMulticityStore((state) => state.sport);
  const removeLocation = useMulticityStore((state) => state.removeLocation);
  const moveLocationUp = useMulticityStore((state) => state.moveLocationUp);
  const moveLocationDown = useMulticityStore((state) => state.moveLocationDown);

  const renderCard = (location: SavedLocation, index: number) => (
    <CityCard
      key={location.id}
      location={location}
      cardState={getCardState(location)}
      sport={sport}
      index={index}
      totalCount={locations.length}
      onRemove={() => removeLocation(location.id)}
      onMoveUp={() => moveLocationUp(location.id)}
      onMoveDown={() => moveLocationDown(location.id)}
    />
  );

  if (isMobile) {
    return (
      <Stack gap={CONTENT_GAP}>
        {locations.map((location, index) => renderCard(location, index))}
      </Stack>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={CONTENT_GAP}>
      {locations.map((location, index) => renderCard(location, index))}
    </SimpleGrid>
  );
}
