import { useAtomValue, useAtom } from 'jotai';
import {
  unsoldTeamsAtom,
  soldTeamsAtom,
  onTheBlockAtom,
  auctionAtom,
  teamsWithEVAtom,
  poolAtom,
  famePremiumsAtom,
  courseFitsAtom,
} from '../atoms';
import TeamCard from './TeamCard';
import AuctionBlock from './AuctionBlock';

export default function TeamList() {
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const unsoldTeams = useAtomValue(unsoldTeamsAtom);
  const soldTeams = useAtomValue(soldTeamsAtom);
  const pool = useAtomValue(poolAtom);
  const famePremiums = useAtomValue(famePremiumsAtom);
  const courseFits = useAtomValue(courseFitsAtom);
  const [onTheBlock, setOnTheBlock] = useAtom(onTheBlockAtom);
  const [auction, setAuction] = useAtom(auctionAtom);

  const blockTeam = teamsWithEV.find((t) => t.groupId === onTheBlock) ?? null;

  // Available = unsold and NOT on the block
  const availableTeams = unsoldTeams.filter((t) => t.groupId !== onTheBlock);

  const handleSelect = (groupId: number) => {
    setOnTheBlock(groupId);
  };

  const handleSold = (groupId: number, price: number) => {
    const newAuction = new Map(auction);
    newAuction.set(groupId, {
      groupId,
      price,
      auctionOrder: newAuction.size + 1,
      sold: true,
    });
    setAuction(newAuction);
    setOnTheBlock(null);
  };

  const handleCancel = () => {
    setOnTheBlock(null);
  };

  if (teamsWithEV.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">⛳</div>
          <p className="text-lg font-medium">No teams loaded</p>
          <p className="text-sm mt-1">
            Switch to Setup to import teams and player data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-20">
      {/* On the Block */}
      {blockTeam && (
        <section>
          <SectionHeader label="On the Block" count={1} accent />
          <AuctionBlock
            team={blockTeam}
            onSold={handleSold}
            onCancel={handleCancel}
          />
        </section>
      )}

      {/* Available */}
      {availableTeams.length > 0 && (
        <section>
          <SectionHeader label="Available" count={availableTeams.length} />
          <div className="space-y-2">
            {availableTeams.map((team) => (
              <TeamCard
                key={team.groupId}
                team={team}
                isOnTheBlock={false}
                pool={pool}
                famePremiums={famePremiums}
                courseFits={courseFits}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sold */}
      {soldTeams.length > 0 && (
        <section>
          <SectionHeader label="Sold" count={soldTeams.length} />
          <div className="space-y-2">
            {soldTeams.map((team) => {
              const entry = auction.get(team.groupId);
              return (
                <TeamCard
                  key={team.groupId}
                  team={team}
                  auctionEntry={entry}
                  isOnTheBlock={false}
                  pool={pool}
                  famePremiums={famePremiums}
                  courseFits={courseFits}
                  onSelect={() => {}}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2
        className={`text-sm font-bold uppercase tracking-wider ${
          accent ? 'text-[#FFD700]' : 'text-[#006747]'
        }`}
      >
        {label}
      </h2>
      <span className="text-xs text-gray-400 font-medium">({count})</span>
    </div>
  );
}
