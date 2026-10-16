import { Chapter } from '../components/Chapter';
import { TrackExplorer } from '../components/TrackExplorer';

export function AcademicPlan() {
  return (
    <Chapter lede="Choose your stream and the grade you joined in to see every subject you will study, semester by semester.">
      <TrackExplorer />
    </Chapter>
  );
}
