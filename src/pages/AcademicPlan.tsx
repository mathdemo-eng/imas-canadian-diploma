import { ArrowRight } from 'lucide-react';
import parliament from '../assets/photos/parliament-ottawa.webp';
import scienceLab from '../assets/photos/science-lab.webp';
import { Chapter } from '../components/Chapter';
import { ParallaxBanner, PhotoCaption, RevealImage } from '../components/media';
import { TrackExplorer } from '../components/TrackExplorer';
import { ButtonLink, Section } from '../components/ui';

export function AcademicPlan() {
  return (
    <Chapter lede="Choose your stream and the grade you joined in to see every subject you will study, semester by semester.">
      <TrackExplorer />

      <ParallaxBanner
        src={scienceLab}
        alt="Two IMAS students in white lab coats, one looking through a microscope, in the school’s science laboratory"
        sizeClass="aspect-[4/3] sm:aspect-[2/1]"
        position="50% 40%"
      >
        <PhotoCaption title="From the plan to the lab" text="Science courses such as Biology, Chemistry and Physics come with hands-on work in IMAS’s laboratories." />
      </ParallaxBanner>

      <Section eyebrow="A Canadian curriculum" title="New Brunswick courses, taught at IMAS">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <RevealImage
            src={parliament}
            alt="Canada’s Parliament in Ottawa: the Peace Tower with the Canadian flag, under a blue sky"
            aspect="3 / 4"
            position="50% 30%"
            caption="Parliament Hill, Ottawa"
            className="mx-auto w-full max-w-[420px]"
          />
          <div className="grid content-start gap-5">
            <p className="text-[1.1rem] text-ink-2">
              The courses in your plan follow the New Brunswick curriculum, one of Canada’s provincial school systems. You study them at IMAS, and when you meet
              the graduation requirements you receive the same New Brunswick High School Diploma as students in Canada.
            </p>
            <p className="text-ink-2">
              Courses that continue from Grade 10 are not new subjects, and Grade 12 preparation courses get you ready for your final-year subjects.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/graduation">
                Graduation requirements <ArrowRight size={18} aria-hidden />
              </ButtonLink>
              <ButtonLink to="/assessment" variant="secondary">
                How courses are assessed
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </Chapter>
  );
}
