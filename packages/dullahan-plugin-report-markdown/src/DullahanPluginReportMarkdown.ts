import {
    DullahanPluginReportMarkdownDefaultOptions,
    DullahanPluginReportMarkdownUserOptions
} from './DullahanPluginReportMarkdownOptions';

import {
    Artifact,
    DullahanClient,
    DullahanFunctionEndCall,
    DullahanPlugin,
    DullahanTestEndCall
} from '@k2g/dullahan';
import {
    formatFailingTable,
    formatFailingTest,
    formatSlowTable,
    formatSlowTest,
    formatSuccessfulTable,
    formatSuccessfulTest,
    formatUnstableTable,
    formatUnstableTest,
    isFailingTest,
    isSlowTest,
    isSuccessfulTest,
    isUnstableTest,
    Test
} from "./helpers/formatter";

export default class DullahanPluginReportMarkdown extends DullahanPlugin<DullahanPluginReportMarkdownUserOptions,
    typeof DullahanPluginReportMarkdownDefaultOptions> {

    public constructor(args: {
        client: DullahanClient;
        userOptions: DullahanPluginReportMarkdownUserOptions;
    }) {
        super({
            ...args,
            defaultOptions: DullahanPluginReportMarkdownDefaultOptions
        });
    }

    public async getArtifacts(dtecs: DullahanTestEndCall[], dfecs: DullahanFunctionEndCall[]): Promise<Artifact[]> {
        const {options} = this;
        const {slowTestThreshold, reportTitle, reportTitleUrl, hideSlowTests, hideSuccessfulTests, hideUnstableTests} = options;

        const tests: Test[] = dtecs
            .reverse()
            .filter(({testId}, index) => index === dtecs.findIndex((dtec) => dtec.testId === testId))
            .map((dtec) => ({
                ...dtec,
                calls: dfecs.filter(({testId}) => dtec.testId === testId)
            }))
            .reverse();

        const failingTests = tests.filter(isFailingTest).map(formatFailingTest);
        const unstableTests = tests.filter(isUnstableTest).map(formatUnstableTest);
        const slowTests = tests.filter(isSlowTest.bind(null, slowTestThreshold)).map(formatSlowTest);
        const successfulTests = tests.filter(isSuccessfulTest.bind(null, slowTestThreshold)).map(formatSuccessfulTest);

        const tables = [
            failingTests.length && formatFailingTable(failingTests),
            !hideUnstableTests && unstableTests.length && formatUnstableTable(unstableTests),
            !hideSlowTests && slowTests.length && formatSlowTable(slowTests),
            !hideSuccessfulTests && successfulTests.length && formatSuccessfulTable(successfulTests)
        ].filter((table) => !!table).join('\n');

        const data = [
            `# [${reportTitle}](${reportTitleUrl})`,
            tables
        ].join('\n');

        return [{
            scope: 'dullahan-plugin-report-markdown',
            name: 'report',
            ext: 'md',
            encoding: 'utf-8',
            mimeType: 'text/x-gfm',
            data
        }];
    }
}
