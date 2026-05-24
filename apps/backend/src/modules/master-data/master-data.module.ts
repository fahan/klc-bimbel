import { Module } from '@nestjs/common'
import { BranchesModule } from './branches/branches.module'
import { SubjectsModule } from './subjects/subjects.module'
import { SppRatesModule } from './spp-rates/spp-rates.module'
import { CurriculumModulesModule } from './curriculum-modules/curriculum-modules.module'

@Module({
  imports: [BranchesModule, SubjectsModule, SppRatesModule, CurriculumModulesModule],
  exports: [BranchesModule, SubjectsModule, SppRatesModule, CurriculumModulesModule],
})
export class MasterDataModule {}
